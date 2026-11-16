using System.Net;
using EnterpriseAuthBff;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.TestHost;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EnterpriseAuthBff.Tests;

public class OidcAdmissionTests
{
    internal static void SmallBudget(Microsoft.AspNetCore.Builder.WebApplicationBuilder builder, int login = 2, int callback = 2) =>
        builder.Services.AddSingleton<OidcAdmission>(_ => new OidcAdmission(login, callback));

    private static Task<Harness> Start(FakeProvider provider, ProbeRegistry? registry = null, int login = 2, int callback = 2) =>
        Harness.Start(builder => {
            SmallBudget(builder, login, callback);
            builder.Services.Configure<OpenIdConnectOptions>(BffApplication.OidcScheme,
                o => o.Backchannel = new HttpClient(provider));
        }, registry: registry);

    internal static async Task Rejected(HttpResponseMessage response)
    {
        using (response)
        {
            Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
            Assert.Equal("no-store", response.Headers.CacheControl!.ToString());
            Assert.Equal("1", response.Headers.GetValues("X-EP12-BFF").Single());
            Assert.Equal(TimeSpan.FromSeconds(10), response.Headers.RetryAfter!.Delta);
            Assert.False(response.Headers.Contains("Set-Cookie"));
            Assert.Null(response.Headers.Location);
            Assert.Empty(response.Headers.WwwAuthenticate);
            Assert.Equal(0L, response.Content.Headers.ContentLength);
            Assert.Empty(await response.Content.ReadAsByteArrayAsync());
        }
    }

    [Fact]
    public void Default_login_budget_is_60_and_other_inputs_do_not_spend_either_budget()
    {
        using var admission = new OidcAdmission();
        for (var i = 0; i < 200; i++)
        {
            Assert.True(admission.Allows("POST", "/auth/login"));
            Assert.True(admission.Allows("HEAD", "/signin-oidc"));
            Assert.True(admission.Allows("GET", "/auth/complete"));
            Assert.True(admission.Allows("GET", "/auth/login/other"));
        }
        for (var i = 0; i < 60; i++) Assert.True(admission.Allows("GET", "/auth/login"));
        Assert.False(admission.Allows("GET", "/auth/login"));
        Assert.True(admission.Allows("GET", "/signin-oidc"));
    }

    [Fact]
    public async Task Default_callback_budget_rejects_after_180_malformed_callbacks()
    {
        await using var host = await Harness.Start();
        for (var i = 0; i < 180; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await host.Client.GetAsync("/signin-oidc?state=invalid")).StatusCode);
        await Rejected(await host.Client.GetAsync("/signin-oidc?state=invalid"));
    }

    [Fact]
    public async Task Login_flood_preserves_real_callback_and_rejects_before_cookie_DB_or_provider()
    {
        using var provider = new FakeProvider(); var registry = new ProbeRegistry();
        await using var host = await Start(provider, registry);
        using var first = await host.Client.GetAsync("/auth/login");
        Assert.Equal(HttpStatusCode.Redirect, first.StatusCode);
        using var second = await host.Client.GetAsync("/auth/login");
        Assert.Equal(HttpStatusCode.Redirect, second.StatusCode);
        var calls = provider.Calls;
        await Rejected(await host.Client.GetAsync("/auth/login"));
        Assert.Equal(calls, provider.Calls); Assert.Equal(0, registry.Calls);

        var query = QueryHelpers.ParseQuery(first.Headers.Location!.Query);
        provider.Nonce = query["nonce"].ToString(); provider.Challenge = query["code_challenge"].ToString();
        using var callback = OidcFlowTests.Callback(first, query["state"].ToString());
        using var completed = await host.Client.SendAsync(callback);
        Assert.Equal(HttpStatusCode.Redirect, completed.StatusCode);
        Assert.Equal(1, provider.Redemptions); Assert.Equal(1, registry.Creates);
        var cookie = completed.Headers.GetValues("Set-Cookie").Single(x => x.StartsWith("__Host-Http-EP12=")).Split(';')[0];
        var before = registry.Calls;
        registry.Inner.Unavailable = true;
        using var spoof = new HttpRequestMessage(HttpMethod.Get, "/auth/login");
        spoof.Headers.Add("Cookie", cookie);
        spoof.Headers.Add("X-Forwarded-For", "203.0.113.22");
        spoof.Headers.Add("Origin", "https://bff.example.test"); spoof.Headers.Add("X-Tenant", "admin");
        calls = provider.Calls;
        await Rejected(await host.Client.SendAsync(spoof));
        Assert.Equal(before, registry.Calls); Assert.Equal(calls, provider.Calls);
        Assert.Equal(HttpStatusCode.OK, (await host.Client.GetAsync("/auth/complete")).StatusCode);
        Assert.Equal(0, host.Outbound.Calls);
    }

    [Fact]
    public async Task Callback_flood_blocks_valid_redemption_before_provider_or_session_registration()
    {
        using var provider = new FakeProvider(); var registry = new ProbeRegistry();
        await using var host = await Start(provider, registry);
        for (var i = 0; i < 2; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await host.Client.GetAsync("/signin-oidc?state=bad")).StatusCode);
        // Login capacity remains independent of exhausted callbacks.
        using var login = await host.Client.GetAsync("/auth/login");
        Assert.Equal(HttpStatusCode.Redirect, login.StatusCode);
        var query = QueryHelpers.ParseQuery(login.Headers.Location!.Query);
        provider.Nonce = query["nonce"].ToString(); provider.Challenge = query["code_challenge"].ToString();
        using var callback = OidcFlowTests.Callback(login, query["state"].ToString());
        var calls = provider.Calls;
        await Rejected(await host.Client.SendAsync(callback));
        Assert.Equal(calls, provider.Calls); Assert.Equal(0, provider.Redemptions);
        Assert.Equal(0, registry.Calls); Assert.Equal(0, host.Outbound.Calls);
    }

    [Fact]
    public async Task Spoofed_headers_cookies_and_queries_never_create_new_buckets()
    {
        using var provider = new FakeProvider();
        await using var host = await Start(provider);
        for (var i = 0; i < 8; i++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/auth/login");
            request.Headers.Add("X-Forwarded-For", $"203.0.113.{i}");
            request.Headers.Add("Origin", $"https://attacker{i}.test");
            request.Headers.Add("Cookie", $"__Host-Http-EP12=forged{i}");
            var response = await host.Client.SendAsync(request);
            if (i < 2) Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
            else await Rejected(response);
        }
        await Rejected(await host.Client.GetAsync("/auth/login?tenant=admin&sub=forged"));
        Assert.Equal(0, host.Outbound.Calls);
    }

    [Fact]
    public async Task Invalid_ingress_and_other_routes_methods_do_not_consume_capacity()
    {
        using var provider = new FakeProvider();
        await using var host = await Start(provider, login: 1, callback: 1);
        using var wrongHost = new HttpRequestMessage(HttpMethod.Get, "/auth/login"); wrongHost.Headers.Host = "evil.test";
        Assert.Equal(HttpStatusCode.BadRequest, (await host.Client.SendAsync(wrongHost)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await host.Client.GetAsync("http://bff.example.test/auth/login")).StatusCode);
        var raw = await host.App.GetTestServer().SendAsync(c => {
            c.Request.Scheme = "https"; c.Request.Host = new HostString("bff.example.test");
            c.Request.Method = "GET"; c.Request.Path = "/auth/login";
            c.Features.Get<IHttpRequestFeature>()!.RawTarget = "/auth/%6cogin";
        });
        Assert.Equal(400, raw.Response.StatusCode);
        foreach (var path in new[] { "/auth/login/other", "/auth/complete", "/signin-oidc/other" })
            Assert.NotEqual(HttpStatusCode.TooManyRequests, (await host.Client.GetAsync(path)).StatusCode);
        foreach (var method in new[] { HttpMethod.Post, HttpMethod.Head, HttpMethod.Options })
            foreach (var path in new[] { "/auth/login", "/signin-oidc" })
            {
                using var request = new HttpRequestMessage(method, path);
                Assert.Equal(HttpStatusCode.MethodNotAllowed, (await host.Client.SendAsync(request)).StatusCode);
            }
        Assert.Equal(HttpStatusCode.BadRequest, (await host.Client.GetAsync("/SIGNIN-OIDC?state=bad")).StatusCode);
        Assert.Equal(HttpStatusCode.Redirect, (await host.Client.GetAsync("/auth/login")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await host.Client.GetAsync("/signin-oidc?state=bad")).StatusCode);
        await Rejected(await host.Client.GetAsync("/auth/login"));
        await Rejected(await host.Client.GetAsync("/signin-oidc?state=bad"));
    }

    [Theory]
    [InlineData("/auth/login", 403)]
    [InlineData("/signin-oidc", 401)]
    public async Task Concurrent_requests_admit_exactly_cap_with_no_queue(string path, int admittedStatus)
    {
        const int cap = 7;
        await using var host = await Harness.Start(builder => SmallBudget(builder, cap, cap));
        using var start = new ManualResetEventSlim(false);
        var tasks = Enumerable.Range(0, 64).Select(_ => Task.Run(async () => {
            start.Wait();
            using var request = new HttpRequestMessage(HttpMethod.Get, path);
            // Login denial after admission avoids expensive random cookie/provider work.
            request.Headers.Add("Sec-Fetch-Site", "cross-site");
            return await host.Client.SendAsync(request);
        })).ToArray();
        start.Set();
        var responses = await Task.WhenAll(tasks).WaitAsync(TimeSpan.FromSeconds(20));
        Assert.Equal(cap, responses.Count(r => (int)r.StatusCode == admittedStatus));
        Assert.Equal(64 - cap, responses.Count(r => r.StatusCode == HttpStatusCode.TooManyRequests));
        foreach (var response in responses.Where(r => r.StatusCode == HttpStatusCode.TooManyRequests)) await Rejected(response);
        foreach (var response in responses) response.Dispose();
        Assert.Equal(0, host.Outbound.Calls);
    }

    [Fact]
    public async Task Hosts_own_independent_budgets_and_dispose_them()
    {
        var first = await Harness.Start(builder => SmallBudget(builder, 1, 1));
        var limiter = first.App.Services.GetRequiredService<OidcAdmission>();
        Assert.True(limiter.Allows("GET", "/auth/login")); Assert.False(limiter.Allows("GET", "/auth/login"));
        await using var second = await Harness.Start(builder => SmallBudget(builder, 1, 1));
        Assert.True(second.App.Services.GetRequiredService<OidcAdmission>().Allows("GET", "/auth/login"));
        await first.DisposeAsync();
        Assert.Throws<ObjectDisposedException>(() => limiter.Allows("GET", "/auth/login"));
        Assert.Throws<ObjectDisposedException>(() => limiter.Allows("GET", "/signin-oidc"));
    }
}

internal sealed class ProbeRegistry : ISessionRegistry
{
    public MemorySessionRegistry Inner { get; } = new();
    public int Calls;
    public int Creates;
    public Task Create(string sid, MappedPrincipal p, DateTimeOffset issued, DateTimeOffset expires, CancellationToken ct)
    { Interlocked.Increment(ref Calls); Interlocked.Increment(ref Creates); return Inner.Create(sid, p, issued, expires, ct); }
    public Task<bool> Validate(string sid, MappedPrincipal p, CancellationToken ct)
    { Interlocked.Increment(ref Calls); return Inner.Validate(sid, p, ct); }
    public Task Revoke(string sid, MappedPrincipal p, bool all, CancellationToken ct)
    { Interlocked.Increment(ref Calls); return Inner.Revoke(sid, p, all, ct); }
}
