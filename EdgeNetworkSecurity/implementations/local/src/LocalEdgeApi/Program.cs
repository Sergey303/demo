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

var port = ConfigInt("LOCAL_EDGE_PORT", 5088, 1024, 65535);
var permits = ConfigInt("LOCAL_EDGE_PERMITS", 4, 1, 100);
var windowSeconds = ConfigInt("LOCAL_EDGE_WINDOW_SECONDS", 2, 1, 60);
var concurrency = ConfigInt("LOCAL_EDGE_CONCURRENCY", 2, 1, 32);

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options =>
{
    options.AddServerHeader = false;
    options.Listen(IPAddress.Loopback, port); // Cannot be switched to 0.0.0.0 by ASPNETCORE_URLS.
});
builder.Services.AddSingleton<DemoCounters>();
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
app.UseRateLimiter();

app.MapGet("/health", () => Results.Ok(new { status = "ok", loopbackOnly = true }));
app.MapGet("/metrics", (DemoCounters counters) => Results.Ok(counters.Snapshot()));

app.MapGet("/api/expensive", async (HttpContext request, DemoCounters counters, SemaphoreSlim slots) =>
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
        return Results.Ok(new { status = "processed" });
    }
    finally
    {
        slots.Release();
    }
}).RequireRateLimiting("expensive");

app.Run();

internal sealed class DemoCounters
{
    private long _started, _completed, _rejected, _busy;
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
        scope = "single_process",
        status = "local-tested",
    };
}
