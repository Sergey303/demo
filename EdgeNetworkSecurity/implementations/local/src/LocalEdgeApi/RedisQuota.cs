using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using StackExchange.Redis;

/// <summary>
/// A deliberately small, single-key, Redis-time-based fixed-window quota.
/// All API replicas use the same key/namespace. NOT a distributed concurrency semaphore.
/// </summary>
internal sealed class RedisQuota : IAsyncDisposable
{
    private const string AtomicScript = """
        local clock = redis.call('TIME')
        local nowMs = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
        local windowMs = tonumber(ARGV[2])
        local bucket = math.floor(nowMs / windowMs)
        local previous = redis.call('GET', KEYS[1])
        local count = 0
        if previous then
            local split = string.find(previous, ':', 1, true)
            if split then
                local previousBucket = tonumber(string.sub(previous, 1, split - 1))
                if previousBucket == bucket then
                    count = tonumber(string.sub(previous, split + 1)) or 0
                end
            end
        end
        count = count + 1
        redis.call('SET', KEYS[1], tostring(bucket) .. ':' .. tostring(count), 'PX', windowMs * 2)
        return { count, windowMs - (nowMs % windowMs) }
        """;

    private static readonly Regex ValidNamespace = new("^[a-zA-Z0-9_-]{1,32}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly int _redisPort;
    private readonly int _permits;
    private readonly int _windowMs;
    private readonly RedisKey _quotaKey;
    private readonly SemaphoreSlim _connectionGate = new(1, 1);
    private ConnectionMultiplexer? _connection;
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
        var connection = await GetConnectionAsync(ct);
        var raw = await connection.GetDatabase().ScriptEvaluateAsync(
            AtomicScript, new[] { _quotaKey },
            new RedisValue[] { _permits, _windowMs }).WaitAsync(TimeSpan.FromSeconds(1), ct);

        // EVAL gives two integers from the same atomic operation (server time and increment).
        var response = (RedisResult[])raw!;
        if (response.Length != 2)
            throw new InvalidOperationException("Unexpected Redis quota result.");
        var count = (long)response[0];
        var retryMilliseconds = (long)response[1];
        if (count < 1 || retryMilliseconds is < 1 or > 60000)
            throw new InvalidOperationException("Invalid Redis quota result.");
        return new QuotaDecision(count <= _permits, Math.Max(1,
            (int)Math.Ceiling(retryMilliseconds / 1000.0)));
    }

    private async Task<ConnectionMultiplexer> GetConnectionAsync(CancellationToken ct)
    {
        if (_connection is { IsConnected: true } connected)
            return connected;

        await _connectionGate.WaitAsync(ct);
        try
        {
            if (_connection is { IsConnected: true } current)
                return current;
            if (Environment.TickCount64 < _retryAfterTick)
                throw new InvalidOperationException("Redis retry cooldown.");

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
            };
            config.EndPoints.Add(IPAddress.Loopback, _redisPort);
            ConnectionMultiplexer? next = null;
            try
            {
                next = await ConnectionMultiplexer.ConnectAsync(config)
                    .WaitAsync(TimeSpan.FromSeconds(2), ct);
                var previous = _connection;
                _connection = next;
                if (previous is not null)
                    await previous.DisposeAsync();
                return next;
            }
            catch
            {
                if (next is not null)
                    await next.DisposeAsync();
                _retryAfterTick = Environment.TickCount64 + 750;
                throw;
            }
        }
        finally
        {
            _connectionGate.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_connection is not null)
            await _connection.DisposeAsync();
        _connectionGate.Dispose();
    }
}

internal readonly record struct QuotaDecision(bool Allowed, int RetryAfterSeconds);
