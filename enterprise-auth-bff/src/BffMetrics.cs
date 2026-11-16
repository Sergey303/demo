using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace EnterpriseAuthBff;

// One DI-owned meter per host. Only closed vocabularies cross this boundary.
public sealed class BffMetrics : IDisposable
{
    internal Meter Meter { get; } = new("EnterpriseAuthBff", "1.0.0");
    private readonly Counter<long> requests;
    private readonly Histogram<double> duration;
    private readonly Counter<long> oidc;
    private readonly Counter<long> registry;
    public BffMetrics()
    {
        requests = Meter.CreateCounter<long>("request_total", "{request}");
        duration = Meter.CreateHistogram<double>("request_duration_ms", "ms");
        oidc = Meter.CreateCounter<long>("oidc_failures_total", "{failure}");
        registry = Meter.CreateCounter<long>("session_registry_failures_total", "{failure}");
    }
    internal static string Route(string? path) => path switch {
        "/auth/login" => "login", "/signin-oidc" => "oidc_callback",
        "/auth/session" or "/enterprise-search/agent/identity" => "session",
        "/auth/logout" or "/auth/logout-all" => "logout",
        _ when path != null && (path.StartsWith("/enterprise-api/", StringComparison.Ordinal) ||
            path.StartsWith("/enterprise-search/", StringComparison.Ordinal)) => "proxy",
        _ => "other"
    };
    internal static string Outcome(int status) => status switch {
        >= 200 and < 400 => "success", 401 => "unauthorized", 403 => "forbidden",
        429 => "rate_limited", 503 => "unavailable", 502 or 504 => "upstream_failure",
        >= 500 and < 600 => "error", _ => "other"
    };
    internal async Task Observe(HttpContext context, RequestDelegate next)
    {
        var start = Stopwatch.GetTimestamp();
        var route = Route(context.Request.Path.Value);
        try { await next(context); }
        finally
        {
            var elapsed = Stopwatch.GetElapsedTime(start).TotalMilliseconds;
            var tags = new TagList { { "route", route }, { "outcome", Outcome(context.Response.StatusCode) } };
            // A faulty in-process listener must never change HTTP/auth behavior or
            // prevent the other instrument from being attempted.
            try { requests.Add(1, tags); } catch (Exception) { }
            try { duration.Record(elapsed, tags); } catch (Exception) { }
        }
    }
    internal void RemoteFailure()
    { try { oidc.Add(1, new KeyValuePair<string, object?>("reason", "remote")); } catch (Exception) { } }
    internal enum Operation { Create, Validate, Revoke }
    internal async Task<T> Registry<T>(Operation operation, CancellationToken aborted, Func<Task<T>> action)
    {
        try { return await action(); }
        catch (Exception ex)
        {
            if (ex is not OperationCanceledException || !aborted.IsCancellationRequested)
            {
                var label = operation switch { Operation.Create => "create", Operation.Validate => "validate", _ => "revoke" };
                try { registry.Add(1, new KeyValuePair<string, object?>("operation", label)); } catch (Exception) { }
            }
            throw;
        }
    }
    internal Task Registry(Operation operation, CancellationToken aborted, Func<Task> action) =>
        Registry(operation, aborted, async () => { await action(); return true; });
    public void Dispose() => Meter.Dispose();
}
