using EnterpriseAuthBff;

namespace EnterpriseAuthBff.Tests;

// Test-only fake. Production composition has no flag/environment bypass.
internal sealed class MemorySessionRegistry : ISessionRegistry
{
    private readonly Dictionary<string, (MappedPrincipal Principal, DateTimeOffset Issued, DateTimeOffset Expires, bool Revoked)> rows = new();
    public bool Unavailable { get; set; }
    public bool FailCreate { get; set; }
    public bool FailRevoke { get; set; }
    private void Check() { if (Unavailable) throw new IOException("secret-marker-not-for-response"); }
    public Task Create(string sid, MappedPrincipal principal, DateTimeOffset issued, DateTimeOffset expires, CancellationToken ct)
    {
        Check(); if (FailCreate) throw new IOException("secret-marker"); lock (rows) rows.Add(sid, (principal, issued, expires, false)); return Task.CompletedTask;
    }
    public Task<bool> Validate(string sid, MappedPrincipal principal, CancellationToken ct)
    {
        Check(); lock (rows) return Task.FromResult(rows.TryGetValue(sid, out var row) && row.Principal == principal &&
            !row.Revoked && row.Issued <= DateTimeOffset.UtcNow && row.Expires > DateTimeOffset.UtcNow);
    }
    public Task Revoke(string sid, MappedPrincipal principal, bool all, CancellationToken ct)
    {
        Check(); if (FailRevoke) throw new IOException("secret-marker"); lock (rows)
            foreach (var key in rows.Keys.ToArray())
            {
                var row = rows[key];
                if (row.Principal == principal && (all || key == sid)) rows[key] = row with { Revoked = true };
            }
        return Task.CompletedTask;
    }
}
