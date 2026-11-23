using System.Net;
using System.Text.RegularExpressions;
using StackExchange.Redis;

/// <summary>
/// A deliberately small, single-key, Redis-time-based fixed-window quota.
/// All API replicas use the same key/namespace. NOT a distributed concurrency semaphore.
/// </summary>
internal sealed class RedisQuota : IAsyncDisposable
{
    private static readonly string AtomicScript = LoadScript();
    private static readonly TimeSpan CommandTimeout = TimeSpan.FromSeconds(1);

    private static string LoadScript()
    {
        using var resource = typeof(RedisQuota).Assembly.GetManifestResourceStream("quota-v1.lua")
            ?? throw new InvalidOperationException("Missing embedded quota script.");
        using var reader = new StreamReader(resource);
        return reader.ReadToEnd();
    }

    private static readonly Regex ValidNamespace = new("""\A[a-zA-Z0-9_-]{1,32}\z""",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly int _redisPort;
    private readonly int _permits;
    private readonly int _windowMs;
    private readonly RedisKey _quotaKey;
    private readonly SemaphoreSlim _connectionGate = new(1, 1);
    private volatile ConnectionMultiplexer? _connection;
    private long _retryAfterTick;

    public RedisQuota(int port, string quotaNamespace, int permits, int windowSeconds)
    {
        if (port is < 1024 or > 65535)
            throw new ArgumentOutOfRangeException(nameof(port));
        if (quotaNamespace is null || !ValidNamespace.IsMatch(quotaNamespace))
            throw new ArgumentException("Namespace must be 1..32 ASCII letters, digits, _ or -.",
                nameof(quotaNamespace));
        if (permits is < 1 or > 100 || windowSeconds is < 1 or > 60)
            throw new ArgumentException("Invalid quota configuration.");

        _redisPort = port;
        _permits = permits;
        _windowMs = checked(windowSeconds * 1000);
        _quotaKey = $"demo:edge:quota:v1:{quotaNamespace}";
    }

    public async Task<QuotaDecision> CheckAsync(CancellationToken ct)
    {
        var database = await GetDatabaseAsync(ct);
        var raw = await database.ScriptEvaluateAsync(
            AtomicScript, new[] { _quotaKey },
            new RedisValue[] { _permits, _windowMs }).WaitAsync(CommandTimeout, ct);
        ct.ThrowIfCancellationRequested();

        if (raw.Resp2Type != ResultType.Array ||
            (RedisResult[]?)raw is not [{ Resp2Type: ResultType.Integer } allowed,
                                        { Resp2Type: ResultType.Integer } remaining] ||
            (long)allowed is not (0 or 1) || (long)remaining < 1 || (long)remaining > _windowMs)
            throw new QuotaUnavailableException("Invalid Redis quota result.");
        return new QuotaDecision((long)allowed == 1, (int)Math.Ceiling((long)remaining / 1000.0));
    }

    public async Task ProbeAsync(CancellationToken ct)
    {
        var database = await GetDatabaseAsync(ct);
        await database.PingAsync().WaitAsync(CommandTimeout, ct);
        ct.ThrowIfCancellationRequested();
    }

    private async Task<IDatabase> GetDatabaseAsync(CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        var connection = await GetConnectionAsync(ct).WaitAsync(TimeSpan.FromSeconds(2), ct);
        ct.ThrowIfCancellationRequested();
        return connection.GetDatabase();
    }

    public static bool IsDependencyFailure(Exception error) =>
        error is RedisException or TimeoutException or QuotaUnavailableException;

    private async Task<ConnectionMultiplexer> GetConnectionAsync(CancellationToken ct)
    {
        if (_connection is { } connected)
            return connected;

        await _connectionGate.WaitAsync(ct);
        try
        {
            if (_connection is { } current)
                return current;
            if (Environment.TickCount64 < _retryAfterTick)
                throw new QuotaUnavailableException("Redis retry cooldown.");

            var config = new ConfigurationOptions
            {
                AbortOnConnectFail = true,
                ConnectTimeout = 350,
                ConnectRetry = 0,
                AsyncTimeout = 500,
                SyncTimeout = 500,
                ResolveDns = false,
                ClientName = "edge-demo-local-quota",
                AllowAdmin = false,
                BacklogPolicy = BacklogPolicy.FailFast,
            };
            config.EndPoints.Add(IPAddress.Loopback, _redisPort);
            ConnectionMultiplexer next;
            try
            {
                // Finish acquiring the connection even if the initiating request stops waiting.
                // The gate stays held until the result has an owner.
                next = await ConnectionMultiplexer.ConnectAsync(config);
            }
            catch (Exception error) when (IsDependencyFailure(error))
            {
                _retryAfterTick = Environment.TickCount64 + 750;
                throw;
            }

            // The multiplexer reconnects after a warm outage. Reuse it to avoid
            // disposing connections that another request has already obtained.
            _connection = next;
            return next;
        }
        finally
        {
            _connectionGate.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        await _connectionGate.WaitAsync();
        try
        {
            if (_connection is not null)
                await _connection.DisposeAsync();
        }
        finally
        {
            _connectionGate.Dispose();
        }
    }
}

internal readonly record struct QuotaDecision(bool Allowed, int RetryAfterSeconds);

internal sealed class QuotaUnavailableException(string message) : Exception(message);
