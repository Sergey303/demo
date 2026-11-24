using System.Net;
using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using EnterpriseAuthBff;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;
using Xunit;

namespace EnterpriseAuthBff.Tests;

public sealed class SessionPostgresFactAttribute : FactAttribute
{
    public SessionPostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("EP12_TEST_SESSION_CONNECTION")))
            Skip = "Requires explicitly opted-in disposable EP12_TEST_SESSION_CONNECTION.";
    }
}

public class PostgresSessionTests : IClassFixture<SessionDatabase>
{
    private readonly SessionDatabase db;
    private static MappedPrincipal Account => BoundaryTests.Config().Principals.Single();
    public PostgresSessionTests(SessionDatabase db) => this.db = db;

    [SessionPostgresFact]
    public async Task Exact_fields_expiry_and_revocation_are_fresh_and_audited()
    {
        await db.Registry.CheckSchema(default);
        var sid = SessionId.New(); var now = DateTimeOffset.UtcNow;
        await db.Registry.Create(sid, Account, now, now.AddMinutes(30), default);
        Assert.True(await db.Registry.Validate(sid, Account, default));
        foreach (var wrong in new[] { Account with { Issuer = "https://wrong.test" }, Account with { Sub = "wrong" },
                     Account with { Tenant = "wrong" }, Account with { Subject = "wrong" } })
        {
            Assert.False(await db.Registry.Validate(sid, wrong, default));
            await db.Registry.Revoke(sid, wrong, true, default);
            Assert.True(await db.Registry.Validate(sid, Account, default));
        }
        var expired = SessionId.New();
        await db.Registry.Create(expired, Account, now.AddHours(-1), now.AddMinutes(-30), default);
        Assert.False(await db.Registry.Validate(expired, Account, default));
        await db.Registry.Revoke(sid, Account, false, default);
        Assert.False(await db.Registry.Validate(sid, Account, default));
        await db.Registry.Revoke(sid, Account, false, default);
        await using var audit = db.Source!.CreateCommand("SELECT event_kind FROM ep12_bff_session_audit WHERE sid_hash = @hash ORDER BY event_id");
        audit.Parameters.AddWithValue("hash", SessionId.Hash(sid));
        await using var reader = await audit.ExecuteReaderAsync(); var events = new List<string>();
        while (await reader.ReadAsync()) events.Add(reader.GetString(0));
        Assert.Equal(new[] { "created", "revoked" }, events);
    }

    [SessionPostgresFact]
    public async Task Revoke_all_is_exact_account_and_concurrent_revoke_is_idempotent()
    {
        var now = DateTimeOffset.UtcNow; var one = SessionId.New(); var two = SessionId.New(); var other = SessionId.New();
        var different = Account with { Sub = "different" };
        foreach (var (sid, account) in new[] { (one, Account), (two, Account), (other, different) })
            await db.Registry.Create(sid, account, now, now.AddMinutes(30), default);
        await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => db.Registry.Revoke(one, Account, true, default)));
        Assert.False(await db.Registry.Validate(one, Account, default)); Assert.False(await db.Registry.Validate(two, Account, default));
        Assert.True(await db.Registry.Validate(other, different, default));
        await using var cmd = db.Source!.CreateCommand("SELECT count(*) FROM ep12_bff_session_audit WHERE sid_hash = @hash AND event_kind = 'revoke_all'");
        cmd.Parameters.AddWithValue("hash", SessionId.Hash(two)); Assert.Equal(1L, await cmd.ExecuteScalarAsync());
    }

    [SessionPostgresFact]
    public async Task Audit_failure_rolls_back_create_and_revoke_and_audit_cannot_be_changed()
    {
        var sid = SessionId.New(); var now = DateTimeOffset.UtcNow;
        await db.Registry.Create(sid, Account, now, now.AddMinutes(30), default);
        // Transactional fault injection in this test's private schema only.
        await using (var fail = db.Source!.CreateCommand("""
            CREATE FUNCTION fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'test audit unavailable'; END $$;
            CREATE TRIGGER fail_audit BEFORE INSERT ON ep12_bff_session_audit FOR EACH ROW EXECUTE FUNCTION fail_audit();
            """)) await fail.ExecuteNonQueryAsync();
        var uncreated = SessionId.New();
        try
        {
            await Assert.ThrowsAsync<PostgresException>(() => db.Registry.Create(uncreated, Account, now, now.AddMinutes(30), default));
            Assert.False(await db.Registry.Validate(uncreated, Account, default));
            await Assert.ThrowsAsync<PostgresException>(() => db.Registry.Revoke(sid, Account, true, default));
            Assert.True(await db.Registry.Validate(sid, Account, default));
        }
        finally
        {
            await using var restore = db.Source!.CreateCommand("DROP TRIGGER fail_audit ON ep12_bff_session_audit; DROP FUNCTION fail_audit()");
            await restore.ExecuteNonQueryAsync();
        }
        foreach (var sql in new[] { "DELETE FROM ep12_bff_session_audit", "UPDATE ep12_bff_session_audit SET event_kind = 'revoked'", "TRUNCATE ep12_bff_session_audit" })
        {
            await using var cmd = db.Source!.CreateCommand(sql);
            await Assert.ThrowsAsync<PostgresException>(async () => { await cmd.ExecuteNonQueryAsync(); });
        }
    }

    [SessionPostgresFact]
    public async Task Framework_oidc_cookie_survives_restart_two_hosts_then_replay_is_denied()
    {
        using var files = new SecureFiles();
        using var cert = X509CertificateLoader.LoadPkcs12FromFile(files.Pfx, files.Values()["EP12_DP_CERT_PASSWORD"], System.Security.Cryptography.X509Certificates.X509KeyStorageFlags.EphemeralKeySet);
        void Configure(Microsoft.AspNetCore.Builder.WebApplicationBuilder builder)
        {
            builder.Services.RemoveAll<IDataProtectionProvider>();
            builder.Services.AddDataProtection().SetApplicationName(BffInfrastructure.ApplicationName)
                .PersistKeysToFileSystem(new DirectoryInfo(files.Keys)).ProtectKeysWithCertificate(cert);
        }
        string cookie;
        using var provider = new FakeProvider();
        await using (var first = await Harness.Start(b => {
            Configure(b);
            b.Services.Configure<OpenIdConnectOptions>(BffApplication.OidcScheme, o => o.Backchannel = new HttpClient(provider));
        }, registry: db.Registry))
        {
            var login = await first.Client.GetAsync("/auth/login"); var query = QueryHelpers.ParseQuery(login.Headers.Location!.Query);
            provider.Nonce = query["nonce"].ToString(); provider.Challenge = query["code_challenge"].ToString();
            using var callback = new HttpRequestMessage(HttpMethod.Get, "/signin-oidc?code=one-time-code&state=" + Uri.EscapeDataString(query["state"].ToString()));
            callback.Headers.Add("Cookie", string.Join("; ", login.Headers.GetValues("Set-Cookie").Select(x => x.Split(';')[0])));
            var response = await first.Client.SendAsync(callback);
            Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
            cookie = response.Headers.GetValues("Set-Cookie").Single(x => x.StartsWith("__Host-Http-EP12=")).Split(';')[0];
        }
        // Independent hosts load keys from disk, not a shared in-memory provider.
        await using var second = await Harness.Start(Configure, registry: db.Registry);
        await using var third = await Harness.Start(Configure, registry: db.Registry);
        async Task<HttpStatusCode> Send(Harness host, string path, bool post = false)
        {
            using var request = new HttpRequestMessage(post ? HttpMethod.Post : HttpMethod.Get, path);
            request.Headers.Add("Cookie", cookie); if (post) request.Headers.Add("Origin", "https://bff.example.test");
            return (await host.Client.SendAsync(request)).StatusCode;
        }
        Assert.Equal(HttpStatusCode.OK, await Send(second, "/auth/session"));
        Assert.Equal(HttpStatusCode.OK, await Send(third, "/auth/session"));
        Assert.Equal(HttpStatusCode.NoContent, await Send(second, "/auth/logout", true));
        Assert.Equal(HttpStatusCode.Unauthorized, await Send(third, "/enterprise-api/ready"));
        Assert.Equal(0, third.Outbound.Calls);
    }

    [SessionPostgresFact]
    public async Task Precancelled_mutations_do_not_change_state_or_audit()
    {
        var sid = SessionId.New(); var now = DateTimeOffset.UtcNow;
        await db.Registry.Create(sid, Account, now, now.AddMinutes(30), default);
        using var canceled = new CancellationTokenSource(); canceled.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => db.Registry.Revoke(sid, Account, true, canceled.Token));
        Assert.True(await db.Registry.Validate(sid, Account, default));
        var notCreated = SessionId.New();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => db.Registry.Create(notCreated, Account, now, now.AddMinutes(30), canceled.Token));
        Assert.False(await db.Registry.Validate(notCreated, Account, default));
    }

    [SessionPostgresFact]
    public async Task Least_privilege_runtime_role_can_operate_but_cannot_mutate_audit()
    {
        var role = "ep12b_role_" + Guid.NewGuid().ToString("N");
        await using (var admin = db.Source!.CreateCommand($"""
            CREATE ROLE {role} NOLOGIN;
            GRANT USAGE ON SCHEMA {db.Schema} TO {role};
            GRANT SELECT, INSERT, UPDATE ON ep12_bff_sessions TO {role};
            GRANT SELECT, INSERT ON ep12_bff_session_audit TO {role};
            GRANT USAGE, SELECT ON SEQUENCE ep12_bff_session_audit_event_id_seq TO {role};
            """)) await admin.ExecuteNonQueryAsync();
        try
        {
            var cs = new NpgsqlConnectionStringBuilder(db.Connection!) { Options = "-c role=" + role };
            await using var runtime = NpgsqlDataSource.Create(cs.ConnectionString);
            var registry = new PostgresSessionRegistry(runtime); var sid = SessionId.New(); var now = DateTimeOffset.UtcNow;
            await registry.CheckSchema(default);
            await registry.Create(sid, Account, now, now.AddMinutes(30), default);
            Assert.True(await registry.Validate(sid, Account, default));
            await registry.Revoke(sid, Account, false, default);
            Assert.False(await registry.Validate(sid, Account, default));
            foreach (var sql in new[] { "DELETE FROM ep12_bff_sessions", "DELETE FROM ep12_bff_session_audit", "TRUNCATE ep12_bff_session_audit" })
            {
                await using var denied = runtime.CreateCommand(sql);
                var error = await Assert.ThrowsAsync<PostgresException>(async () => { await denied.ExecuteNonQueryAsync(); });
                Assert.Equal("42501", error.SqlState);
            }
        }
        finally
        {
            await using var cleanup = db.Source!.CreateCommand($"DROP OWNED BY {role}; DROP ROLE {role}");
            await cleanup.ExecuteNonQueryAsync();
        }
    }

    [SessionPostgresFact]
    public async Task Missing_schema_and_disposed_database_fail_closed()
    {
        var cs = new NpgsqlConnectionStringBuilder(db.Connection!) { SearchPath = "nonexistent_ep12b_schema" };
        await using var source = NpgsqlDataSource.Create(cs.ConnectionString); var registry = new PostgresSessionRegistry(source);
        await Assert.ThrowsAsync<PostgresException>(() => registry.CheckSchema(default));
        await using var host = await Harness.Start(registry: db.Registry); var cookie = host.Cookie();
        await using var dead = NpgsqlDataSource.Create(db.Connection!); await dead.DisposeAsync();
        await using var failed = await Harness.Start(registry: new PostgresSessionRegistry(dead));
        // Reprotect a registered SID with the failed host's own keys.
        var principal = Account.Principal(); ((ClaimsIdentity)principal.Identity!).AddClaim(new(SessionId.Claim, SessionId.New()));
        using var read = new HttpRequestMessage(HttpMethod.Get, "/enterprise-api/ready"); read.Headers.Add("Cookie", failed.Cookie(principal, false));
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await failed.Client.SendAsync(read)).StatusCode);
        Assert.Equal(0, failed.Outbound.Calls);
    }
}

public sealed class SessionDatabase : IAsyncLifetime
{
    public string? Connection { get; private set; }
    public NpgsqlDataSource? Source { get; private set; }
    public PostgresSessionRegistry Registry { get; private set; } = null!;
    private string? schema;
    public string Schema => schema!;
    public async Task InitializeAsync()
    {
        var connection = Environment.GetEnvironmentVariable("EP12_TEST_SESSION_CONNECTION");
        if (string.IsNullOrWhiteSpace(connection)) return;
        schema = "ep12b_test_" + Guid.NewGuid().ToString("N");
        await using var admin = NpgsqlDataSource.Create(connection);
        await using (var create = admin.CreateCommand($"CREATE SCHEMA {schema}")) await create.ExecuteNonQueryAsync();
        Connection = new NpgsqlConnectionStringBuilder(connection) { SearchPath = schema }.ConnectionString;
        Source = NpgsqlDataSource.Create(Connection); Registry = new PostgresSessionRegistry(Source);
        await using var migrate = Source.CreateCommand(await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "001_sessions.sql")));
        await migrate.ExecuteNonQueryAsync();
    }
    public async Task DisposeAsync()
    {
        if (Source != null) await Source.DisposeAsync();
        if (schema == null) return;
        await using var admin = NpgsqlDataSource.Create(Environment.GetEnvironmentVariable("EP12_TEST_SESSION_CONNECTION")!);
        await using var drop = admin.CreateCommand($"DROP SCHEMA {schema} CASCADE"); await drop.ExecuteNonQueryAsync();
    }
}
