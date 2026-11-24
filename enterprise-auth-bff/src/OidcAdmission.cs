using System.Threading.RateLimiting;

namespace EnterpriseAuthBff;

// Two fixed host-owned budgets. No request-derived partition keys or queue.
public sealed class OidcAdmission : IDisposable
{
    private readonly SlidingWindowRateLimiter login;
    private readonly SlidingWindowRateLimiter callback;

    public OidcAdmission() : this(60, 180, TimeSpan.FromMinutes(1), true) { }

    // Test assembly only: deterministic exhaustion without timer-driven replenishment.
    internal OidcAdmission(int loginLimit, int callbackLimit)
        : this(loginLimit, callbackLimit, TimeSpan.FromHours(1), false) { }

    private OidcAdmission(int loginLimit, int callbackLimit, TimeSpan window, bool autoReplenishment)
    {
        login = Create(loginLimit, window, autoReplenishment);
        callback = Create(callbackLimit, window, autoReplenishment);
    }

    private static SlidingWindowRateLimiter Create(int limit, TimeSpan window, bool autoReplenishment) => new(new() {
        PermitLimit = limit, Window = window, SegmentsPerWindow = 6,
        QueueLimit = 0, AutoReplenishment = autoReplenishment,
        QueueProcessingOrder = QueueProcessingOrder.OldestFirst
    });

    public bool Allows(string method, string? path)
    {
        if (method != "GET") return true;
        var limiter = path switch {
            "/auth/login" => login,
            "/signin-oidc" => callback,
            _ => null
        };
        if (limiter == null) return true;
        using var lease = limiter.AttemptAcquire(1);
        return lease.IsAcquired;
    }

    public void Dispose() { login.Dispose(); callback.Dispose(); }
}
