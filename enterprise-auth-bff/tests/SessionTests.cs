using System.Net;
using Xunit;

namespace EnterpriseAuthBff.Tests;

public class SessionTests
{
    [Theory]
    [InlineData("/auth/logout", false)]
    [InlineData("/auth/logout-all", true)]
    public async Task Revocation_denies_stolen_cookie_on_next_request(string endpoint, bool all)
    {
        await using var host = await Harness.Start();
        var first = host.Cookie(); var second = host.Cookie();
        using var logout = new HttpRequestMessage(HttpMethod.Post, endpoint);
        logout.Headers.Add("Cookie", first); logout.Headers.Add("Origin", "https://bff.example.test");
        Assert.Equal(HttpStatusCode.NoContent, (await host.Client.SendAsync(logout)).StatusCode);
        using var replay = new HttpRequestMessage(HttpMethod.Get, "/enterprise-api/ready"); replay.Headers.Add("Cookie", first);
        Assert.Equal(HttpStatusCode.Unauthorized, (await host.Client.SendAsync(replay)).StatusCode);
        Assert.Equal(0, host.Outbound.Calls);
        using var other = new HttpRequestMessage(HttpMethod.Get, "/auth/session"); other.Headers.Add("Cookie", second);
        Assert.Equal(all ? HttpStatusCode.Unauthorized : HttpStatusCode.OK, (await host.Client.SendAsync(other)).StatusCode);
    }
}

public class SessionNegativeTests
{
    [Theory]
    [InlineData("missing")]
    [InlineData("unregistered")]
    [InlineData("duplicate")]
    [InlineData("malformed")]
    [InlineData("noncanonical")]
    [InlineData("expired")]
    [InlineData("issuer")]
    [InlineData("sub")]
    [InlineData("tenant")]
    [InlineData("subject")]
    public async Task Invalid_session_never_proxies(string kind)
    {
        await using var host = await Harness.Start();
        var mapped = BoundaryTests.Config().Principals.Single();
        var sid = EnterpriseAuthBff.SessionId.New();
        var principal = mapped.Principal();
        if (kind != "missing")
            ((System.Security.Claims.ClaimsIdentity)principal.Identity!).AddClaim(new(EnterpriseAuthBff.SessionId.Claim,
                kind == "malformed" ? "bad" : kind == "noncanonical" ? new string('A', 42) + "B" : sid));
        if (kind == "duplicate") ((System.Security.Claims.ClaimsIdentity)principal.Identity!).AddClaim(new(EnterpriseAuthBff.SessionId.Claim, sid));
        var row = kind switch {
            "issuer" => mapped with { Issuer = "https://other.test" },
            "sub" => mapped with { Sub = "other" },
            "tenant" => mapped with { Tenant = "other" },
            "subject" => mapped with { Subject = "other" },
            _ => mapped
        };
        if (kind != "unregistered") await host.Registry.Create(sid, row, DateTimeOffset.UtcNow.AddMinutes(-31),
            kind == "expired" ? DateTimeOffset.UtcNow.AddSeconds(-1) : DateTimeOffset.UtcNow.AddMinutes(10), default);
        using var request = new HttpRequestMessage(HttpMethod.Get, "/enterprise-api/ready");
        request.Headers.Add("Cookie", host.Cookie(principal, register: false));
        var response = await host.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(0, host.Outbound.Calls);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), x => x.Contains("expires="));
    }

    [Theory]
    [InlineData("/enterprise-api/ready", "GET")]
    [InlineData("/auth/session", "GET")]
    [InlineData("/enterprise-search/agent/identity", "GET")]
    [InlineData("/auth/logout", "POST")]
    [InlineData("/auth/logout-all", "POST")]
    public async Task Registry_outage_is_generic_503_never_authorized(string path, string method)
    {
        var registry = new MemorySessionRegistry();
        await using var host = await Harness.Start(registry: registry);
        var cookie = host.Cookie(); registry.Unavailable = true;
        using var request = new HttpRequestMessage(new HttpMethod(method), path);
        request.Headers.Add("Cookie", cookie); request.Headers.Add("Origin", "https://bff.example.test");
        var response = await host.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.DoesNotContain("secret-marker", await response.Content.ReadAsStringAsync());
        Assert.Equal(0, host.Outbound.Calls);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("https://evil.test")]
    public async Task Logout_all_requires_exact_origin_and_keeps_session_on_denial(string? origin)
    {
        await using var host = await Harness.Start(); var cookie = host.Cookie();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/auth/logout-all");
        request.Headers.Add("Cookie", cookie); if (origin != null) request.Headers.Add("Origin", origin);
        Assert.Equal(HttpStatusCode.Forbidden, (await host.Client.SendAsync(request)).StatusCode);
        using var read = new HttpRequestMessage(HttpMethod.Get, "/auth/session"); read.Headers.Add("Cookie", cookie);
        Assert.Equal(HttpStatusCode.OK, (await host.Client.SendAsync(read)).StatusCode);
    }
}

public class MutationFailureTests
{
    [Theory]
    [InlineData("/auth/logout")]
    [InlineData("/auth/logout-all")]
    public async Task Revoke_failure_does_not_claim_success_or_delete_cookie(string path)
    {
        var registry = new MemorySessionRegistry { FailRevoke = true };
        await using var host = await Harness.Start(registry: registry); var cookie = host.Cookie();
        using var request = new HttpRequestMessage(HttpMethod.Post, path);
        request.Headers.Add("Cookie", cookie); request.Headers.Add("Origin", "https://bff.example.test");
        var response = await host.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
        Assert.DoesNotContain("secret-marker", await response.Content.ReadAsStringAsync());
        using var read = new HttpRequestMessage(HttpMethod.Get, "/auth/session"); read.Headers.Add("Cookie", cookie);
        Assert.Equal(HttpStatusCode.OK, (await host.Client.SendAsync(read)).StatusCode);
    }
}
