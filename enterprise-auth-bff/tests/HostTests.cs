using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using EnterpriseAuthBff;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;

namespace EnterpriseAuthBff.Tests;

public class HostTests
{
    [Theory]
    [InlineData("/enterprise-api/ready")]
    [InlineData("/enterprise-search/search")]
    [InlineData("/enterprise-search/agent/identity")]
    [InlineData("/auth/session")]
    [InlineData("/")]
    [InlineData("/assets/index.js")]
    public async Task No_cookie_or_forged_bearer_never_reaches_backend(string path)
    {
        await using var host = await Harness.Start();
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Authorization = new("Bearer", "forged");
        request.Headers.Add("Cookie", "__Host-Http-EP12=forged");
        request.Headers.Add("X-Tenant", "admin");
        var response = await host.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("1", response.Headers.GetValues("X-EP12-BFF").Single());
        Assert.Equal("no-store", response.Headers.CacheControl!.ToString());
        Assert.Equal(0, host.Outbound.Calls);
    }

    [Fact]
    public async Task Verified_identity_and_session_do_not_leak_oidc_claims_or_tokens()
    {
        await using var host = await Harness.Start();
        var cookie = host.Cookie();
        foreach (var path in new[] { "/auth/session", "/enterprise-search/agent/identity" })
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, path);
            request.Headers.Add("Cookie", cookie);
            var response = await host.Client.SendAsync(request);
            var text = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains("\"tenant\":\"alpha\"", text);
            Assert.Contains(path == "/auth/session" ? "\"sub\":\"alice\"" : "\"subject\":\"alice\"", text);
            Assert.DoesNotContain("stable-001", text);
            Assert.DoesNotContain("token", text);
            if (path.Contains("identity")) Assert.Contains("\"identity_kind\":\"oidc\"", text);
        }
        Assert.Equal(0, host.Outbound.Calls);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("https://evil.test", "cross-site")]
    [InlineData("https://bff.example.test", "cross-site")]
    [InlineData("https://bff.example.test.evil.test", "same-origin")]
    public async Task Unsafe_post_and_logout_denied_before_outbound(string? origin, string? site)
    {
        await using var host = await Harness.Start();
        foreach (var path in new[] { "/enterprise-search/answer", "/auth/logout" })
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(new { question = "hello" }) };
            request.Headers.Add("Cookie", host.Cookie());
            if (origin != null) request.Headers.Add("Origin", origin);
            if (site != null) request.Headers.Add("Sec-Fetch-Site", site);
            Assert.Equal(HttpStatusCode.Forbidden, (await host.Client.SendAsync(request)).StatusCode);
        }
        Assert.Equal(0, host.Outbound.Calls);
    }

    [Fact]
    public async Task Proxy_reconstructs_allowlisted_headers_and_never_echoes_cookie_or_redirect()
    {
        await using var host = await Harness.Start();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/enterprise-api/audio-jobs") { Content = JsonContent.Create(new { hello = "world" }) };
        request.Headers.Add("Cookie", host.Cookie());
        request.Headers.Add("Origin", "https://bff.example.test");
        request.Headers.Add("Authorization", "Bearer attacker");
        request.Headers.Add("Forwarded", "host=evil.test");
        request.Headers.Add("X-Tenant", "forged");
        request.Headers.Add("Idempotency-Key", "once-001");
        var response = await host.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("http://127.0.0.1:5077/audio-jobs", host.Outbound.Target);
        Assert.DoesNotContain("Cookie", host.Outbound.Headers.Keys);
        Assert.DoesNotContain("Forwarded", host.Outbound.Headers.Keys);
        Assert.DoesNotContain("X-Tenant", host.Outbound.Headers.Keys);
        Assert.Equal("once-001", host.Outbound.Headers["Idempotency-Key"]);
        var identity = ReliableJobs.AudioIdentity.FromAuthorization(host.Outbound.Headers["Authorization"], BoundaryTests.Config().SigningSecret);
        Assert.Equal(new ReliableJobs.AudioIdentity("alpha", "alice"), identity);
        Assert.False(response.Headers.Contains("Set-Cookie"));
        host.Outbound.Redirect = true;
        using var next = new HttpRequestMessage(HttpMethod.Get, "/enterprise-search/search"); next.Headers.Add("Cookie", host.Cookie());
        response = await host.Client.SendAsync(next);
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.Null(response.Headers.Location);
    }

    [Theory]
    [InlineData("/enterprise-apiX/ready")]
    [InlineData("/enterprise-api/%2e%2e/ready")]
    [InlineData("/enterprise-api/a%2fb")]
    [InlineData("/enterprise-api//ready")]
    [InlineData("/enterprise-search/search?tenant=evil")]
    public async Task Unsafe_paths_never_reach_backend(string path)
    {
        await using var host = await Harness.Start();
        using var request = new HttpRequestMessage(HttpMethod.Get, path); request.Headers.Add("Cookie", host.Cookie());
        Assert.NotEqual(HttpStatusCode.OK, (await host.Client.SendAsync(request)).StatusCode);
        Assert.Equal(0, host.Outbound.Calls);
    }

    [Theory]
    [InlineData("/enterprise-api/%2e%2e/ready")]
    [InlineData("/enterprise-api/../ready")]
    [InlineData("/enterprise-api/a%2Fb")]
    [InlineData("/enterprise-api/a\\b")]
    [InlineData("/enterprise-api//ready")]
    public async Task Original_raw_target_is_checked_before_normalized_routing(string raw)
    {
        await using var host = await Harness.Start();
        var result = await host.App.GetTestServer().SendAsync(context => {
            context.Request.Scheme = "https";
            context.Request.Host = new HostString("bff.example.test");
            context.Request.Method = "GET";
            context.Request.Path = "/enterprise-api/ready";
            context.Request.Headers.Cookie = host.Cookie();
            context.Features.Get<IHttpRequestFeature>()!.RawTarget = raw;
        });
        Assert.Equal(400, result.Response.StatusCode);
        Assert.Equal(0, host.Outbound.Calls);
    }

    [Theory]
    [InlineData("text/plain", 415)]
    [InlineData("application/json", 413)]
    public async Task Chunked_request_limits_and_content_type_are_checked_before_outbound(string type, int status)
    {
        await using var host = await Harness.Start();
        using var stream = new NonSeekableMemoryStream(System.Text.Encoding.UTF8.GetBytes(new string('x', status == 413 ? 400_001 : 10)));
        using var request = new HttpRequestMessage(HttpMethod.Post, "/enterprise-search/answer") { Content = new StreamContent(stream) };
        Assert.Null(request.Content.Headers.ContentLength);
        request.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(type);
        request.Headers.TransferEncodingChunked = true;
        request.Headers.Add("Cookie", host.Cookie()); request.Headers.Add("Origin", "https://bff.example.test");
        Assert.Equal(status, (int)(await host.Client.SendAsync(request)).StatusCode);
        Assert.Equal(0, host.Outbound.Calls);
    }

    [Fact]
    public async Task Wrong_host_plain_http_stale_mapping_oversized_body_and_get_logout_fail_closed()
    {
        await using var host = await Harness.Start();
        using var poison = new HttpRequestMessage(HttpMethod.Get, "/auth/session");
        poison.Headers.Host = "evil.test"; poison.Headers.Add("Cookie", host.Cookie());
        Assert.Equal(HttpStatusCode.BadRequest, (await host.Client.SendAsync(poison)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await host.Client.GetAsync("http://bff.example.test/auth/session")).StatusCode);
        using var stale = new HttpRequestMessage(HttpMethod.Get, "/auth/session");
        var wrong = new MappedPrincipal("https://idp.example.test", "stable-001", "evil", "alice");
        stale.Headers.Add("Cookie", host.Cookie(wrong.Principal()));
        var staleResponse = await host.Client.SendAsync(stale);
        Assert.Equal(HttpStatusCode.Unauthorized, staleResponse.StatusCode);
        Assert.Contains(staleResponse.Headers.GetValues("Set-Cookie"), x => x.Contains("expires="));
        using var big = new HttpRequestMessage(HttpMethod.Post, "/enterprise-search/answer") { Content = new StringContent(new string('a', 400_001), System.Text.Encoding.UTF8, "application/json") };
        big.Headers.Add("Origin", "https://bff.example.test"); big.Headers.Add("Cookie", host.Cookie());
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await host.Client.SendAsync(big)).StatusCode);
        using var logout = new HttpRequestMessage(HttpMethod.Get, "/auth/logout"); logout.Headers.Add("Cookie", host.Cookie());
        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await host.Client.SendAsync(logout)).StatusCode);
        Assert.Equal(0, host.Outbound.Calls);
    }

    [Fact]
    public async Task Only_authenticated_compiled_files_are_served_and_symlinks_are_denied()
    {
        var fixture = Path.Combine(Path.GetTempPath(), "ep12-spa-" + Guid.NewGuid());
        var contentRoot = Path.Combine(fixture, "enterprise-auth-bff", "src");
        var dist = Path.Combine(fixture, "bootstrap5", "dist");
        Directory.CreateDirectory(contentRoot); Directory.CreateDirectory(Path.Combine(dist, "assets"));
        await File.WriteAllTextAsync(Path.Combine(dist, "index.html"), "<html>compiled-spa</html>");
        await File.WriteAllTextAsync(Path.Combine(dist, "assets", "index.js"), "const compiled = true;");
        await File.WriteAllTextAsync(Path.Combine(fixture, "private.js"), "outside-dist-marker");
        try
        {
            File.CreateSymbolicLink(Path.Combine(dist, "assets", "link.js"), Path.Combine(fixture, "private.js"));
            await using var host = await Harness.Start(contentRoot: contentRoot);
            foreach (var path in new[] { "/", "/dashboard/enterprise-ai", "/assets/index.js" })
            {
                Assert.Equal(HttpStatusCode.Unauthorized, (await host.Client.GetAsync(path)).StatusCode);
                using var request = new HttpRequestMessage(HttpMethod.Get, path); request.Headers.Add("Cookie", host.Cookie());
                Assert.Equal(HttpStatusCode.OK, (await host.Client.SendAsync(request)).StatusCode);
            }
            foreach (var path in new[] { "/AGENTS.md", "/assets/link.js", "/demo-api/jobs", "/enterprise-apiX/ready" })
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, path); request.Headers.Add("Cookie", host.Cookie());
                var response = await host.Client.SendAsync(request);
                Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
                Assert.DoesNotContain("outside-dist-marker", await response.Content.ReadAsStringAsync());
            }
            Assert.Equal(0, host.Outbound.Calls);
        }
        finally { Directory.Delete(fixture, true); }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Oversized_upstream_response_fails_without_returning_partial_data(bool chunked)
    {
        await using var host = await Harness.Start();
        host.Outbound.Oversized = true; host.Outbound.ChunkedResponse = chunked;
        using var request = new HttpRequestMessage(HttpMethod.Get, "/enterprise-search/search");
        request.Headers.Add("Cookie", host.Cookie());
        var response = await host.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.DoesNotContain("private-marker", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Logout_expires_secure_cookie_and_missing_dist_returns_503()
    {
        await using var host = await Harness.Start();
        using var root = new HttpRequestMessage(HttpMethod.Get, "/"); root.Headers.Add("Cookie", host.Cookie());
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await host.Client.SendAsync(root)).StatusCode);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/auth/logout");
        request.Headers.Add("Cookie", host.Cookie()); request.Headers.Add("Origin", "https://bff.example.test");
        var response = await host.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var cookie = response.Headers.GetValues("Set-Cookie").Single();
        Assert.Contains("secure", cookie); Assert.Contains("httponly", cookie); Assert.Contains("samesite=strict", cookie);
    }
}

internal sealed class Harness : IAsyncDisposable
{
    public required WebApplication App { get; init; }
    public required HttpClient Client { get; init; }
    public required CaptureHandler Outbound { get; init; }
    public required ISessionRegistry Registry { get; init; }
    public static async Task<Harness> Start(Action<WebApplicationBuilder>? customize = null, string environment = "Testing", string? contentRoot = null, ISessionRegistry? registry = null)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = environment, ContentRootPath = contentRoot ?? Path.GetTempPath() });
        builder.WebHost.UseTestServer();
        var settings = BoundaryTests.Config();
        registry ??= new MemorySessionRegistry();
        BffApplication.AddServices(builder, settings, registry);
        var outbound = new CaptureHandler();
        builder.Services.AddHttpClient("upstream").ConfigurePrimaryHttpMessageHandler(() => outbound);
        customize?.Invoke(builder);
        var app = builder.Build(); BffApplication.Configure(app, settings);
        await app.StartAsync();
        var client = app.GetTestClient(); client.BaseAddress = new Uri(settings.PublicOrigin);
        return new Harness { App = app, Client = client, Outbound = outbound, Registry = registry };
    }
    public string Cookie(ClaimsPrincipal? principal = null, bool register = true)
    {
        var options = App.Services.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>().Get(BffApplication.CookieScheme);
        principal ??= BoundaryTests.Config().Resolve("https://idp.example.test", "stable-001")!.Principal();
        if (register)
        {
            var sid = SessionId.New();
            ((ClaimsIdentity)principal.Identity!).AddClaim(new Claim(SessionId.Claim, sid));
            Registry.Create(sid, BoundaryTests.Config().Resolve("https://idp.example.test", "stable-001")!,
                DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddMinutes(29), CancellationToken.None).GetAwaiter().GetResult();
        }
        var ticket = new AuthenticationTicket(principal,
            new AuthenticationProperties { IssuedUtc = DateTimeOffset.UtcNow, ExpiresUtc = DateTimeOffset.UtcNow.AddMinutes(30) }, BffApplication.CookieScheme);
        return options.Cookie.Name + "=" + options.TicketDataFormat.Protect(ticket);
    }
    public async ValueTask DisposeAsync() { Client.Dispose(); await App.DisposeAsync(); }
}

internal sealed class CaptureHandler : HttpMessageHandler
{
    public int Calls { get; private set; }
    public string? Target { get; private set; }
    public Dictionary<string, string> Headers { get; private set; } = new();
    public bool Redirect { get; set; }
    public bool Oversized { get; set; }
    public bool ChunkedResponse { get; set; }
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Calls++; Target = request.RequestUri!.ToString(); Headers = request.Headers.ToDictionary(x => x.Key, x => string.Join(",", x.Value));
        var response = new HttpResponseMessage(Redirect ? HttpStatusCode.Redirect : HttpStatusCode.OK) { Content = JsonContent.Create(new { ok = true }) };
        if (Oversized) response.Content = new StringContent("private-marker" + new string('x', 2_000_001), System.Text.Encoding.UTF8, "application/json");
        if (Oversized && ChunkedResponse)
        {
            response.Content = new StreamContent(new NonSeekableMemoryStream(System.Text.Encoding.UTF8.GetBytes("private-marker" + new string('x', 2_000_001))));
            response.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
            Assert.Null(response.Content.Headers.ContentLength);
        }
        response.Headers.Add("Set-Cookie", "backend-secret=never");
        if (Redirect) response.Headers.Location = new Uri("https://evil.test");
        return Task.FromResult(response);
    }
}

internal sealed class NonSeekableMemoryStream(byte[] bytes) : MemoryStream(bytes)
{
    public override bool CanSeek => false;
}
