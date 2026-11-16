using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using EnterpriseAuthBff;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace EnterpriseAuthBff.Tests;

// Isolated HTTPS backchannel fixture. No real network, provider credentials, DB or model.
// The real OIDC handler performs discovery, JWKS, code redemption and token validation.
public class OidcFlowTests
{
    [Fact]
    public async Task Real_middleware_code_pkce_nonce_flow_issues_only_mapped_secure_session()
    {
        using var provider = new FakeProvider();
        await using var host = await Start(provider);
        var login = await host.Client.GetAsync("/auth/login");
        Assert.Equal(HttpStatusCode.Redirect, login.StatusCode);
        var query = QueryHelpers.ParseQuery(login.Headers.Location!.Query);
        Assert.Equal("code", query["response_type"]);
        Assert.Equal("S256", query["code_challenge_method"]);
        Assert.Equal("openid", query["scope"]);
        Assert.Equal("https://bff.example.test/signin-oidc", query["redirect_uri"]);
        provider.Nonce = query["nonce"].ToString(); provider.Challenge = query["code_challenge"].ToString();
        using var callback = Callback(login, query["state"].ToString());
        var response = await host.Client.SendAsync(callback);
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal("/auth/complete", response.Headers.Location!.OriginalString);
        Assert.True(provider.PkceVerified);
        var cookie = response.Headers.GetValues("Set-Cookie").Single(x => x.StartsWith("__Host-Http-EP12="));
        Assert.Contains("httponly", cookie); Assert.Contains("secure", cookie); Assert.Contains("samesite=strict", cookie);
        using var session = new HttpRequestMessage(HttpMethod.Get, "/auth/session"); session.Headers.Add("Cookie", cookie.Split(';')[0]);
        var body = await (await host.Client.SendAsync(session)).Content.ReadAsStringAsync();
        Assert.Equal("{\"tenant\":\"alpha\",\"sub\":\"alice\"}", body);
        var options = host.App.Services.GetRequiredService<IOptionsMonitor<Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationOptions>>().Get(BffApplication.CookieScheme);
        var ticket = options.TicketDataFormat.Unprotect(cookie.Split(';')[0].Split('=', 2)[1])!;
        Assert.Empty(ticket.Properties.GetTokens());
        Assert.Equal(5, ticket.Principal.Claims.Count());
        Assert.NotNull(SessionId.From(ticket.Principal));
        Assert.DoesNotContain(ticket.Principal.Claims, c => c.Type is "email" or "tenant" or "access_token");
        Assert.False(options.SlidingExpiration); Assert.True(options.ExpireTimeSpan <= TimeSpan.FromHours(1));
    }

    [Theory]
    [InlineData("issuer")]
    [InlineData("audience")]
    [InlineData("nonce")]
    [InlineData("signature")]
    [InlineData("expired")]
    [InlineData("unknown-sub")]
    [InlineData("state")]
    [InlineData("correlation")]
    public async Task Invalid_protocol_or_unprovisioned_identity_never_gets_session(string failure)
    {
        using var provider = new FakeProvider { Failure = failure };
        await using var host = await Start(provider);
        var login = await host.Client.GetAsync("/auth/login");
        var query = QueryHelpers.ParseQuery(login.Headers.Location!.Query);
        provider.Nonce = query["nonce"].ToString(); provider.Challenge = query["code_challenge"].ToString();
        using var callback = Callback(login, failure == "state" ? "forged-state" : query["state"].ToString(), failure != "correlation");
        var response = await host.Client.SendAsync(callback);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.DoesNotContain(response.Headers.TryGetValues("Set-Cookie", out var cookies) ? cookies : [], x => x.StartsWith("__Host-Http-EP12="));
        Assert.Equal(0, host.Outbound.Calls);
        if (failure is "state" or "correlation") Assert.Equal(0, provider.Redemptions);
    }

    [Fact]
    public async Task Login_has_fixed_return_uri_and_rejects_cross_site_initiation_and_query()
    {
        using var provider = new FakeProvider(); await using var host = await Start(provider);
        using var crossSite = new HttpRequestMessage(HttpMethod.Get, "/auth/login"); crossSite.Headers.Add("Sec-Fetch-Site", "cross-site");
        Assert.Equal(HttpStatusCode.Forbidden, (await host.Client.SendAsync(crossSite)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await host.Client.GetAsync("/auth/login?returnUrl=https://evil.test")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await host.Client.GetAsync("/.well-known/openid-configuration")).StatusCode);
    }

    [Fact]
    public async Task Completion_is_a_public_data_free_document_with_only_a_fixed_continue_link()
    {
        using var provider = new FakeProvider(); await using var host = await Start(provider);
        var response = await host.Client.GetAsync("/auth/complete");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType!.MediaType);
        var text = await response.Content.ReadAsStringAsync();
        Assert.Contains("href=\"/dashboard/enterprise-ai\"", text);
        Assert.DoesNotContain("alice", text); Assert.DoesNotContain("token", text);
        Assert.Null(response.Headers.Location);
        Assert.Contains("frame-ancestors 'none'", response.Headers.GetValues("Content-Security-Policy").Single());
        Assert.Equal(HttpStatusCode.BadRequest, (await host.Client.GetAsync("/auth/complete?next=https://evil.test")).StatusCode);
        Assert.Equal(0, host.Outbound.Calls);
    }

    [Fact]
    public async Task Discovery_failure_returns_sanitized_error()
    {
        using var provider = new FakeProvider { Failure = "unavailable" };
        await using var host = await Start(provider, "Development");
        var response = await host.Client.GetAsync("/auth/login");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var text = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("secret-marker", text);
        Assert.DoesNotContain("Exception", text);
    }

    [Fact]
    public async Task Database_create_failure_never_issues_framework_cookie()
    {
        using var provider = new FakeProvider();
        await using var host = await Harness.Start(builder =>
            builder.Services.Configure<OpenIdConnectOptions>(BffApplication.OidcScheme,
                o => o.Backchannel = new HttpClient(provider)), registry: new MemorySessionRegistry { FailCreate = true });
        var login = await host.Client.GetAsync("/auth/login");
        var query = QueryHelpers.ParseQuery(login.Headers.Location!.Query);
        provider.Nonce = query["nonce"].ToString(); provider.Challenge = query["code_challenge"].ToString();
        using var callback = Callback(login, query["state"].ToString());
        var response = await host.Client.SendAsync(callback);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.DoesNotContain(response.Headers.TryGetValues("Set-Cookie", out var cookies) ? cookies : [], x => x.StartsWith("__Host-Http-EP12="));
        Assert.DoesNotContain("secret-marker", await response.Content.ReadAsStringAsync());
    }

    private static Task<Harness> Start(FakeProvider provider, string environment = "Testing") => Harness.Start(builder =>
        builder.Services.Configure<OpenIdConnectOptions>(BffApplication.OidcScheme, o => {
            o.Backchannel = new HttpClient(provider); // test-only replacement of transport, not validation
        }), environment);
    internal static HttpRequestMessage Callback(HttpResponseMessage login, string state, bool cookies = true)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/signin-oidc?code=one-time-code&state=" + Uri.EscapeDataString(state));
        if (cookies) request.Headers.Add("Cookie", string.Join("; ", login.Headers.GetValues("Set-Cookie").Select(x => x.Split(';')[0])));
        return request;
    }
}

internal sealed class FakeProvider : HttpMessageHandler
{
    private readonly RSA rsa = RSA.Create(2048);
    public string? Failure { get; init; }
    public string Nonce { get; set; } = "";
    public string Challenge { get; set; } = "";
    public bool PkceVerified { get; private set; }
    public int Redemptions { get; private set; }
    private int calls;
    public int Calls => Volatile.Read(ref calls);
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Interlocked.Increment(ref calls);
        if (Failure == "unavailable") throw new HttpRequestException("secret-marker");
        Assert.Equal("https", request.RequestUri!.Scheme); Assert.Equal("idp.example.test", request.RequestUri.Host);
        if (request.RequestUri.AbsolutePath == "/.well-known/openid-configuration")
            return Json(new { issuer = "https://idp.example.test", authorization_endpoint = "https://idp.example.test/authorize",
                token_endpoint = "https://idp.example.test/token", jwks_uri = "https://idp.example.test/jwks",
                response_types_supported = new[] { "code" }, subject_types_supported = new[] { "public" },
                id_token_signing_alg_values_supported = new[] { "RS256" }, code_challenge_methods_supported = new[] { "S256" } });
        if (request.RequestUri.AbsolutePath == "/jwks")
        {
            var p = rsa.ExportParameters(false);
            return Json(new { keys = new[] { new { kty = "RSA", use = "sig", kid = "test-key", alg = "RS256",
                n = WebEncoders.Base64UrlEncode(p.Modulus!), e = WebEncoders.Base64UrlEncode(p.Exponent!) } } });
        }
        Assert.Equal("/token", request.RequestUri.AbsolutePath); Redemptions++;
        var form = QueryHelpers.ParseQuery(await request.Content!.ReadAsStringAsync(cancellationToken));
        Assert.Equal("authorization_code", form["grant_type"]); Assert.Equal("one-time-code", form["code"]);
        Assert.Equal("bff-test", form["client_id"]); Assert.Equal(BoundaryTests.ClientSecret, form["client_secret"]);
        Assert.Equal("https://bff.example.test/signin-oidc", form["redirect_uri"]);
        PkceVerified = Challenge == WebEncoders.Base64UrlEncode(SHA256.HashData(Encoding.ASCII.GetBytes(form["code_verifier"].ToString())));
        Assert.True(PkceVerified);
        using var wrongRsa = RSA.Create(2048);
        var key = new RsaSecurityKey(Failure == "signature" ? wrongRsa : rsa) { KeyId = "test-key" };
        var now = DateTime.UtcNow;
        var jwt = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor {
            Issuer = Failure == "issuer" ? "https://evil.test" : "https://idp.example.test",
            Audience = Failure == "audience" ? "evil-client" : "bff-test",
            IssuedAt = now.AddMinutes(-10), NotBefore = now.AddMinutes(-10),
            Expires = Failure == "expired" ? now.AddMinutes(-5) : now.AddMinutes(5),
            Claims = new Dictionary<string, object> { ["sub"] = Failure == "unknown-sub" ? "not-provisioned" : "stable-001",
                ["nonce"] = Failure == "nonce" ? "wrong" : Nonce, ["tenant"] = "forged-admin", ["email"] = "attacker@example.test" },
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.RsaSha256)
        });
        return Json(new { id_token = jwt, access_token = "not-for-browser", token_type = "Bearer", expires_in = 300 });
    }
    private static HttpResponseMessage Json(object value) => new(HttpStatusCode.OK) { Content = JsonContent.Create(value) };
    protected override void Dispose(bool disposing) { if (disposing) rsa.Dispose(); base.Dispose(disposing); }
}
