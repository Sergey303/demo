using System.Globalization;
using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

static int ConfigInt(string name, int fallback, int min, int max)
{
    var raw = Environment.GetEnvironmentVariable(name);
    if (string.IsNullOrEmpty(raw))
        return fallback;
    if (!int.TryParse(raw, NumberStyles.None, CultureInfo.InvariantCulture, out var value)
        || value < min || value > max)
        throw new InvalidOperationException($"Invalid {name}: expected integer in [{min}, {max}].");
    return value;
}

static string? AbsolutePath(string name)
{
    var path = Environment.GetEnvironmentVariable(name);
    return path is not null && Path.IsPathFullyQualified(path)
        && !path.StartsWith(@"\\", StringComparison.Ordinal)
        && !path.StartsWith("//", StringComparison.Ordinal) ? path : null;
}

var port = ConfigInt("LOCAL_EDGE_PORT", 5088, 1024, 65535);
var permits = ConfigInt("LOCAL_EDGE_PERMITS", 4, 1, 100);
var windowSeconds = ConfigInt("LOCAL_EDGE_WINDOW_SECONDS", 2, 1, 60);
var concurrency = ConfigInt("LOCAL_EDGE_CONCURRENCY", 2, 1, 32);
var redisPortRaw = Environment.GetEnvironmentVariable("LOCAL_EDGE_REDIS_PORT");
await using var redisQuota = redisPortRaw is null
    ? null
    : new RedisQuota(ConfigInt("LOCAL_EDGE_REDIS_PORT", 0, 1024, 65535),
        Environment.GetEnvironmentVariable("LOCAL_EDGE_REDIS_NAMESPACE") ?? "demo-local",
        permits, windowSeconds, AbsolutePath("LOCAL_EDGE_REDIS_PRIMARY_GATE"));

var advisoryEnabled = Environment.GetEnvironmentVariable("LOCAL_EDGE_ADVISORY_ENABLED") == "1";
var advisoryMode = Environment.GetEnvironmentVariable("LOCAL_EDGE_ADVISORY_MODE") ?? "oneshot";
var prewarmSetting = Environment.GetEnvironmentVariable("LOCAL_EDGE_ADVISORY_PREWARM");
if (prewarmSetting is not (null or "0" or "1"))
    throw new InvalidOperationException("Invalid LOCAL_EDGE_ADVISORY_PREWARM: expected 0 or 1.");
var prewarmEnabled = prewarmSetting == "1";
if (prewarmEnabled && (!advisoryEnabled || advisoryMode != "persistent"))
    throw new InvalidOperationException(
        "Invalid LOCAL_EDGE_ADVISORY_PREWARM: 1 requires LOCAL_EDGE_ADVISORY_ENABLED=1 and LOCAL_EDGE_ADVISORY_MODE=persistent.");
if (advisoryEnabled && advisoryMode is not ("oneshot" or "persistent"))
    throw new InvalidOperationException("Invalid LOCAL_EDGE_ADVISORY_MODE: expected oneshot or persistent.");

var python = AbsolutePath("LOCAL_EDGE_ADVISORY_PYTHON");
var artifacts = AbsolutePath("LOCAL_EDGE_ADVISORY_ARTIFACTS");
var script = AbsolutePath("LOCAL_EDGE_ADVISORY_SCRIPT");
var workerScript = AbsolutePath("LOCAL_EDGE_ADVISORY_WORKER_SCRIPT");
var scoreTimeout = advisoryEnabled ? ConfigInt("LOCAL_EDGE_ADVISORY_TIMEOUT_MS", 1500, 100, 3000) : 1500;
var threshold = advisoryEnabled ? ConfigInt("LOCAL_EDGE_ADVISORY_THRESHOLD_PCT", 80, 1, 100) : 80;
await using var persistent = advisoryEnabled && advisoryMode == "persistent"
    ? new PersistentAdvisoryWorker(
        File.Exists(python) && Path.GetFileName(workerScript) == "persistent_worker.py" &&
        File.Exists(workerScript) && Directory.Exists(artifacts)
            ? InlineAdvisory.StartInfo(python!, workerScript!, artifacts!, threshold)
            : null,
        ConfigInt("LOCAL_EDGE_ADVISORY_STARTUP_TIMEOUT_MS", 8000, 100, 12000), scoreTimeout)
    : null;

var advisory = advisoryEnabled
    ? new InlineAdvisory(
        python,
        Path.GetFileName(script) == "inline_advisory.py" && File.Exists(script) ? script : null,
        artifacts, scoreTimeout, threshold,
        ConfigInt("LOCAL_EDGE_ADVISORY_BASELINE_RPS", 2, 1, 100),
        windowSeconds, persistent)
    : null;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options =>
{
    options.AddServerHeader = false;
    options.Listen(IPAddress.Loopback, port); // Cannot be switched to 0.0.0.0 by ASPNETCORE_URLS.
});
builder.Services.AddSingleton(new DemoCounters(redisQuota is not null, advisory, persistent));
builder.Services.AddSingleton(new SemaphoreSlim(concurrency, concurrency));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("expensive", limiter =>
    {
        limiter.PermitLimit = permits;
        limiter.Window = TimeSpan.FromSeconds(windowSeconds);
        limiter.QueueLimit = 0;
        limiter.AutoReplenishment = true;
    });
    options.OnRejected = async (context, ct) =>
    {
        var counters = context.HttpContext.RequestServices.GetRequiredService<DemoCounters>();
        counters.Rejected();
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            var seconds = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds));
            context.HttpContext.Response.Headers.RetryAfter = seconds.ToString(CultureInfo.InvariantCulture);
        }
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { error = "rate_limited" }, cancellationToken: ct);
    };
});

var app = builder.Build();
app.UseRouting();
if (advisory is not null)
{
    app.Use(async (context, next) =>
    {
        if (context.GetEndpoint()?.Metadata.GetMetadata<AdvisoryEndpoint>() is not null)
            advisory.CountRequest(context);
        await next(context);
    });
}
app.UseRateLimiter();

app.MapGet("/health", () => Results.Ok(new { status = "ok", loopbackOnly = true }));
app.MapGet("/ready", async (HttpContext http) =>
{
    http.Response.Headers.CacheControl = "no-store";
    try
    {
        if (redisQuota is not null)
            await redisQuota.ProbeAsync(http.RequestAborted);
        return Results.Ok(new { status = "ready" });
    }
    catch (Exception error) when (RedisQuota.IsDependencyFailure(error))
    {
        http.RequestAborted.ThrowIfCancellationRequested();
        return Results.Json(new { status = "not_ready", error = "quota_dependency_unavailable" },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});
app.MapGet("/metrics", (DemoCounters counters) => Results.Ok(counters.Snapshot()));

var expensiveEndpoint = app.MapGet("/api/expensive", async (HttpContext request, DemoCounters counters, SemaphoreSlim slots) =>
{
    var holdMs = 0;
    if (request.Request.Query.Keys.Any(key => key != "holdMs") ||
        (request.Request.Query.ContainsKey("holdMs") &&
            (!int.TryParse(request.Request.Query["holdMs"], NumberStyles.None,
                CultureInfo.InvariantCulture, out holdMs) || holdMs < 0 || holdMs > 500)))
        return Results.BadRequest(new { error = "invalid_hold_ms" });

    if (!slots.Wait(0))
    {
        counters.Busy();
        return Results.Json(new { error = "concurrency_exhausted" },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    counters.Started();
    try
    {
        if (holdMs > 0)
            await Task.Delay(holdMs, request.RequestAborted);
        counters.Completed();
    }
    finally
    {
        slots.Release();
    }

    if (advisory is null)
        return Results.Ok(new { status = "processed" });
    using var advisoryCancellation = persistent is null ? null :
        CancellationTokenSource.CreateLinkedTokenSource(request.RequestAborted, app.Lifetime.ApplicationStopping);
    var result = await advisory.ScoreAsync(advisoryCancellation?.Token ?? request.RequestAborted);
    return Results.Ok(new { status = "processed", advisory = result });
}).WithMetadata(new AdvisoryEndpoint());

if (redisQuota is null)
{
    // Existing single-process limiter retained when shared Redis mode is not configured.
    expensiveEndpoint.RequireRateLimiting("expensive");
}
else
{
    // All configured replicas share one Redis key. No local fallback on Redis errors:
    // silently accepting via independent local counters would bypass the global quota.
    expensiveEndpoint.AddEndpointFilter(async (filter, next) =>
    {
        var http = filter.HttpContext;
        var counters = http.RequestServices.GetRequiredService<DemoCounters>();
        QuotaDecision quota;
        try
        {
            quota = await redisQuota.CheckAsync(http.RequestAborted);
        }
        catch (Exception error) when (RedisQuota.IsDependencyFailure(error))
        {
            http.RequestAborted.ThrowIfCancellationRequested();
            counters.RedisUnavailable();
            return Results.Json(new { error = "quota_dependency_unavailable" },
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        http.RequestAborted.ThrowIfCancellationRequested();
        if (!quota.Allowed)
        {
            counters.Rejected();
            http.Response.Headers.RetryAfter = quota.RetryAfterSeconds
                .ToString(CultureInfo.InvariantCulture);
            return Results.Json(new { error = "rate_limited" },
                statusCode: StatusCodes.Status429TooManyRequests);
        }
        return await next(filter);
    });
}

Task prewarm = Task.CompletedTask;
var prewarmRegistration = prewarmEnabled
    ? app.Lifetime.ApplicationStarted.Register(() => prewarm = Task.Run(async () =>
    {
        try
        {
            using var stopping = CancellationTokenSource.CreateLinkedTokenSource(app.Lifetime.ApplicationStopping);
            await persistent!.PrewarmAsync(stopping.Token);
        }
        catch (Exception)
        {
            app.Logger.LogWarning("Background advisory prewarm failed.");
        }
    }))
    : default;

try
{
    await app.RunAsync();
}
finally
{
    // Join the startup callback before reading its task, then join the task before worker disposal.
    await prewarmRegistration.DisposeAsync();
    await prewarm;
}

internal sealed class AdvisoryEndpoint;

internal sealed class DemoCounters(bool redisShared, InlineAdvisory? advisory, PersistentAdvisoryWorker? persistent)
{
    private long _started, _completed, _rejected, _busy, _redisUnavailable;
    public void RedisUnavailable() => Interlocked.Increment(ref _redisUnavailable);
    public void Started() => Interlocked.Increment(ref _started);
    public void Completed() => Interlocked.Increment(ref _completed);
    public void Rejected() => Interlocked.Increment(ref _rejected);
    public void Busy() => Interlocked.Increment(ref _busy);

    // Constant metric labels only: no IP, route, user, token, or headers.
    public object Snapshot() => new
    {
        started = Interlocked.Read(ref _started),
        completed = Interlocked.Read(ref _completed),
        rateRejected = Interlocked.Read(ref _rejected),
        concurrencyRejected = Interlocked.Read(ref _busy),
        redisUnavailable = Interlocked.Read(ref _redisUnavailable),
        advisoryScored = advisory?.Scored ?? 0,
        advisoryFallback = advisory?.Fallback ?? 0,
        advisoryObserved = advisory?.Observed ?? 0,
        advisoryWorkerRestarts = persistent?.Restarts ?? 0,
        advisoryWorkerReady = persistent?.IsReady ?? false,
        advisoryPrewarmAttempts = persistent?.PrewarmAttempts ?? 0,
        advisoryPrewarmFailures = persistent?.PrewarmFailures ?? 0,
        scope = redisShared ? "redis_shared" : "single_process",
        status = "local-tested",
    };
}
