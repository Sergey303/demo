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
    private const int RetryCooldownMs = 750;

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
    private readonly string? _primaryGate;
    private readonly SemaphoreSlim _connectionGate = new(1, 1);
    private volatile ConnectionMultiplexer? _connection;
    private readonly object _circuitLock = new();
    private bool _open = true;
    private bool _probing;
    private long _epoch;
    private long _retryAfterTick;
    private Task? _recovery;

    public RedisQuota(int port, string quotaNamespace, int permits, int windowSeconds, string? primaryGate)
    {
        if (port is < 1024 or > 65535)
            throw new ArgumentOutOfRangeException(nameof(port));
        if (quotaNamespace is null || !ValidNamespace.IsMatch(quotaNamespace))
            throw new ArgumentException("Namespace must be 1..32 ASCII letters, digits, _ or -.",
                nameof(quotaNamespace));
        if (permits is < 1 or > 100 || windowSeconds is < 1 or > 60)
            throw new ArgumentException("Invalid quota configuration.");

        _redisPort = port;
        _primaryGate = primaryGate;
        _permits = permits;
        _windowMs = checked(windowSeconds * 1000);
        _quotaKey = $"demo:edge:quota:v1:{quotaNamespace}";
    }

    public async Task<QuotaDecision> CheckAsync(CancellationToken ct)
    {
        var (epoch, _) = await EnterAsync(ct);
        try
        {
            var raw = await Dispatch(epoch, ct, database => database.ScriptEvaluateAsync(
                AtomicScript, new[] { _quotaKey },
                new RedisValue[] { _permits, _windowMs, ReadPrimaryPin(), "admit" })).WaitAsync(CommandTimeout, ct);

            if (raw.Resp2Type != ResultType.Array ||
                (RedisResult[]?)raw is not [{ Resp2Type: ResultType.Integer } allowed,
                                            { Resp2Type: ResultType.Integer } remaining] ||
                (long)allowed is not (0 or 1) || (long)remaining < 1 || (long)remaining > _windowMs)
                throw new QuotaUnavailableException("Invalid Redis quota result.");
            ConfirmEpoch(epoch, ct);
            return new QuotaDecision((long)allowed == 1, (int)Math.Ceiling((long)remaining / 1000.0));
        }
        catch (Exception error) when (IsDependencyFailure(error))
        {
            OpenCircuit(epoch);
            throw;
        }
    }

    public async Task ProbeAsync(CancellationToken ct)
    {
        var (epoch, recovered) = await EnterAsync(ct);
        try
        {
            if (!recovered)
                await Dispatch(epoch, ct, ProbePrimaryAsync).WaitAsync(CommandTimeout, ct);
            ConfirmEpoch(epoch, ct);
        }
        catch (Exception error) when (IsDependencyFailure(error))
        {
            OpenCircuit(epoch);
            throw;
        }
    }

    private async Task<(long Epoch, bool Recovered)> EnterAsync(CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        Task<long> recovery;
        lock (_circuitLock)
        {
            if (!_open)
                return (_epoch, false);
            if (_probing || Environment.TickCount64 < _retryAfterTick)
                throw new QuotaUnavailableException("Redis circuit open.");

            _probing = true;
            recovery = RecoverAsync();
            _recovery = recovery;
            ObserveFailure(recovery);
        }

        // Cancellation only stops this caller from waiting. The read-only probe keeps
        // its slot until it finishes, and it cannot dispatch a quota command.
        return (await recovery.WaitAsync(ct), true);
    }

    private async Task<long> RecoverAsync()
    {
        try
        {
            using var connectDeadline = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            var connectionTask = GetConnectionAsync(connectDeadline.Token);
            ObserveFailure(connectionTask);
            ConnectionMultiplexer connection;
            try
            {
                connection = await connectionTask.WaitAsync(connectDeadline.Token);
            }
            catch (OperationCanceledException) when (connectDeadline.IsCancellationRequested)
            {
                throw new TimeoutException("Redis connection deadline exceeded.");
            }
            await ProbePrimaryAsync(connection.GetDatabase()).WaitAsync(CommandTimeout);
            lock (_circuitLock)
            {
                _open = false;
                _probing = false;
                return _epoch;
            }
        }
        catch
        {
            lock (_circuitLock)
            {
                _retryAfterTick = Environment.TickCount64 + RetryCooldownMs;
                _probing = false;
            }
            throw;
        }
    }

    // The trusted controller atomically replaces a shared local manifest. No
    // cached identity or automatic re-enrollment on reconnect or API restart.
    private string ReadPrimaryPin()
    {
        if (_primaryGate is null)
            throw new QuotaUnavailableException("Primary gate not configured.");
        try
        {
            using var file = File.Open(_primaryGate, FileMode.Open, FileAccess.Read,
                FileShare.Read | FileShare.Delete);
            // Exact bounded ASCII format: <windowMs>:<40 hex run_id> followed by LF.
            if (file.Length > 64)
                throw new QuotaUnavailableException("Invalid primary gate.");
            using var reader = new StreamReader(file);
            var pin = reader.ReadToEnd();
            var prefix = _windowMs.ToString(System.Globalization.CultureInfo.InvariantCulture) + ":";
            if (!pin.StartsWith(prefix, StringComparison.Ordinal) ||
                !Regex.IsMatch(pin[prefix.Length..], @"\A[0-9a-f]{40}\n\z"))
                throw new QuotaUnavailableException("Primary gate closed or invalid.");
            return pin.Substring(prefix.Length, 40);
        }
        catch (Exception error) when (error is IOException or UnauthorizedAccessException)
        {
            throw new QuotaUnavailableException("Primary gate unavailable.");
        }
    }

    private async Task<bool> ProbePrimaryAsync(IDatabase database)
    {
        var raw = await database.ScriptEvaluateAsync(AtomicScript, new[] { _quotaKey },
            new RedisValue[] { _permits, _windowMs, ReadPrimaryPin(), "probe" });
        if (raw.Resp2Type != ResultType.Integer || (long)raw != 1)
            throw new QuotaUnavailableException("Invalid primary probe.");
        return true;
    }

    private static void ObserveFailure(Task task) =>
        _ = task.ContinueWith(static failed => _ = failed.Exception,
            CancellationToken.None, TaskContinuationOptions.OnlyOnFaulted |
            TaskContinuationOptions.ExecuteSynchronously, TaskScheduler.Default);

    private void OpenCircuit(long epoch)
    {
        lock (_circuitLock)
        {
            if (_epoch != epoch || _open)
                return;
            _open = true;
            _epoch++;
            _retryAfterTick = Environment.TickCount64 + RetryCooldownMs;
        }
    }

    private Task<T> Dispatch<T>(long epoch, CancellationToken ct, Func<IDatabase, Task<T>> send)
    {
        lock (_circuitLock)
        {
            EnsureCurrentEpoch(epoch, ct);
            return send(_connection!.GetDatabase());
        }
    }

    private void ConfirmEpoch(long epoch, CancellationToken ct)
    {
        lock (_circuitLock)
            EnsureCurrentEpoch(epoch, ct);
    }

    // Both dispatch and result validation use the same lock as circuit transitions.
    private void EnsureCurrentEpoch(long epoch, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        if (_open || _epoch != epoch)
            throw new QuotaUnavailableException("Redis circuit changed during request.");
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
            // Keep ownership until a connection attempt finishes, even if the probe
            // times out while waiting for it.
            var next = await ConnectionMultiplexer.ConnectAsync(config);

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
        if (_recovery is { } recovery)
        {
            try
            {
                await recovery;
            }
            catch (Exception error) when (IsDependencyFailure(error))
            {
                // Failed probes have already updated the circuit.
            }
        }

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
