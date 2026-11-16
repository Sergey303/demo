using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;
using Npgsql;

namespace EnterpriseAuthBff;

public interface ISessionRegistry
{
    Task Create(string sid, MappedPrincipal principal, DateTimeOffset issued, DateTimeOffset expires, CancellationToken ct);
    Task<bool> Validate(string sid, MappedPrincipal principal, CancellationToken ct);
    Task Revoke(string sid, MappedPrincipal principal, bool all, CancellationToken ct);
}

public static class SessionId
{
    public const string Claim = "bff_sid";
    public static string New() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
    public static string? From(ClaimsPrincipal principal)
    {
        var claims = principal.FindAll(Claim).ToArray();
        if (claims.Length != 1) return null;
        var sid = claims[0].Value;
        if (sid.Length != 43 || sid.Any(c => !char.IsAsciiLetterOrDigit(c) && c is not ('-' or '_'))) return null;
        try { return WebEncoders.Base64UrlEncode(WebEncoders.Base64UrlDecode(sid)) == sid ? sid : null; }
        catch (FormatException) { return null; }
    }
    public static byte[] Hash(string sid) => SHA256.HashData(System.Text.Encoding.ASCII.GetBytes(sid));
}

// No cache: every protected request consults PostgreSQL. SQL errors propagate to
// the generic 503 boundary, never to an authorized principal or upstream request.
public sealed class PostgresSessionRegistry(NpgsqlDataSource source) : ISessionRegistry
{
    private const string Match = "issuer = @issuer AND oidc_sub = @sub AND tenant = @tenant AND subject = @subject";
    public async Task CheckSchema(CancellationToken ct)
    {
        await using var cmd = source.CreateCommand("""
            SELECT sid_hash, issuer, oidc_sub, tenant, subject, issued_at, expires_at, revoked_at
            FROM ep12_bff_sessions LIMIT 0;
            SELECT event_id, sid_hash, event_kind, occurred_at FROM ep12_bff_session_audit LIMIT 0;
            """);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.NextResultAsync(ct)) { }
    }
    public async Task Create(string sid, MappedPrincipal principal, DateTimeOffset issued, DateTimeOffset expires, CancellationToken ct)
    {
        await using var cmd = source.CreateCommand("""
            WITH created AS (
              INSERT INTO ep12_bff_sessions(sid_hash, issuer, oidc_sub, tenant, subject, issued_at, expires_at)
              VALUES (@hash, @issuer, @sub, @tenant, @subject, @issued, @expires) RETURNING sid_hash
            ) INSERT INTO ep12_bff_session_audit(sid_hash, event_kind)
              SELECT sid_hash, 'created' FROM created
            """);
        Bind(cmd, sid, principal);
        cmd.Parameters.AddWithValue("issued", issued); cmd.Parameters.AddWithValue("expires", expires);
        await cmd.ExecuteNonQueryAsync(ct);
    }
    public async Task<bool> Validate(string sid, MappedPrincipal principal, CancellationToken ct)
    {
        await using var cmd = source.CreateCommand($"""
            SELECT EXISTS(SELECT 1 FROM ep12_bff_sessions WHERE sid_hash = @hash AND {Match}
              AND revoked_at IS NULL AND issued_at <= statement_timestamp() AND expires_at > statement_timestamp())
            """);
        Bind(cmd, sid, principal);
        return (bool)(await cmd.ExecuteScalarAsync(ct))!;
    }
    public async Task Revoke(string sid, MappedPrincipal principal, bool all, CancellationToken ct)
    {
        // One statement/transaction: audit INSERT failure rolls back every UPDATE.
        // A concurrent login committed after this statement's snapshot is a new session.
        await using var cmd = source.CreateCommand($"""
            WITH revoked AS (
              UPDATE ep12_bff_sessions SET revoked_at = statement_timestamp()
              WHERE {Match} AND {(all ? "TRUE" : "sid_hash = @hash")}
                AND revoked_at IS NULL AND expires_at > statement_timestamp() RETURNING sid_hash
            ) INSERT INTO ep12_bff_session_audit(sid_hash, event_kind)
              SELECT sid_hash, @kind FROM revoked
            """);
        Bind(cmd, sid, principal); cmd.Parameters.AddWithValue("kind", all ? "revoke_all" : "revoked");
        await cmd.ExecuteNonQueryAsync(ct);
    }
    private static void Bind(NpgsqlCommand cmd, string sid, MappedPrincipal principal)
    {
        cmd.Parameters.AddWithValue("hash", SessionId.Hash(sid));
        cmd.Parameters.AddWithValue("issuer", principal.Issuer); cmd.Parameters.AddWithValue("sub", principal.Sub);
        cmd.Parameters.AddWithValue("tenant", principal.Tenant); cmd.Parameters.AddWithValue("subject", principal.Subject);
    }
}
