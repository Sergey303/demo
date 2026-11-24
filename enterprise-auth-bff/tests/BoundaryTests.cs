using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using EnterpriseAuthBff;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace EnterpriseAuthBff.Tests;

public class BoundaryTests
{
    internal static string ClientSecret { get; } = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
    internal static Dictionary<string, string?> Settings() => new()
    {
        ["EP12_AUTHORITY"] = "https://idp.example.test",
        ["EP12_CLIENT_ID"] = "bff-test",
        ["EP12_CLIENT_SECRET"] = ClientSecret,
        ["EP12_PUBLIC_ORIGIN"] = "https://bff.example.test",
        ["DEMO_AUTH_SECRET"] = new string('s', 40),
        ["EP12_PRINCIPALS"] = """[{"issuer":"https://idp.example.test","sub":"stable-001","tenant":"alpha","subject":"alice"}]"""
    };
    internal static BffSettings Config(Dictionary<string, string?>? values = null) =>
        BffSettings.Load(new ConfigurationBuilder().AddInMemoryCollection(values ?? Settings()).Build());

    [Theory]
    [InlineData("EP12_AUTHORITY", "http://idp.example.test")]
    [InlineData("EP12_AUTHORITY", "https://idp.example.test/?x=1")]
    [InlineData("EP12_PUBLIC_ORIGIN", "https://bff.example.test/path")]
    [InlineData("EP12_PUBLIC_ORIGIN", "https://user:pass@bff.example.test")]
    [InlineData("ASPNETCORE_FORWARDEDHEADERS_ENABLED", "true")]
    [InlineData("EP12_CLIENT_ID", "")]
    [InlineData("EP12_CLIENT_SECRET", "")]
    [InlineData("DEMO_AUTH_SECRET", "short")]
    [InlineData("EP12_PRINCIPALS", "[]")]
    [InlineData("EP12_PRINCIPALS", "null")]
    [InlineData("EP12_PRINCIPALS", "[{}]")]
    public void Invalid_configuration_fails_startup(string key, string value)
    {
        var values = Settings(); values[key] = value;
        Assert.Throws<InvalidOperationException>(() => Config(values));
    }

    [Fact]
    public void Missing_configuration_and_ambiguous_directory_fail_closed()
    {
        foreach (var key in Settings().Keys)
        {
            var values = Settings(); values.Remove(key);
            Assert.Throws<InvalidOperationException>(() => Config(values));
        }
        var duplicate = Settings();
        duplicate["EP12_PRINCIPALS"] = """[{"issuer":"https://idp.example.test","sub":"a","tenant":"a","subject":"a"},{"issuer":"https://idp.example.test","sub":"a","tenant":"b","subject":"b"}]""";
        Assert.Throws<InvalidOperationException>(() => Config(duplicate));
    }

    [Fact]
    public void Mapping_uses_only_exact_validated_issuer_sub_and_rechecks_cookie()
    {
        var settings = Config();
        Assert.Null(settings.Resolve("https://evil.test", "stable-001"));
        Assert.Null(settings.Resolve(settings.Authority, "Alice@example.test"));
        var mapped = settings.Resolve(settings.Authority, "stable-001")!;
        var principal = mapped.Principal();
        Assert.Equal("alpha", settings.FromCookie(principal)!.Tenant);
        ((ClaimsIdentity)principal.Identity!).AddClaim(new Claim("bff_tenant", "forged"));
        Assert.Null(settings.FromCookie(principal));
        var changed = Settings(); changed["EP12_PRINCIPALS"] = """[{"issuer":"https://idp.example.test","sub":"stable-001","tenant":"beta","subject":"alice"}]""";
        Assert.Null(Config(changed).FromCookie(mapped.Principal()));
    }

    [Fact]
    public void Hmac_matches_Python_verified_wire_vector()
    {
        var settings = Config(); var mapped = settings.Resolve(settings.Authority, "stable-001")!;
        // Generated and verified by architecture.audio_access.verify_token at this fixed clock.
        const string expected = "eyJ0ZW5hbnQiOiJhbHBoYSIsInN1YiI6ImFsaWNlIiwiZXhwIjoxODAwMDAwMzAwfQ.hsPZBJhoOADgPBmggOhBwwskBjqs1I0tUe-v7G8V96g";
        Assert.Equal(expected, InternalBearer.Issue(mapped, settings.SigningSecret, new FrozenClock()));
    }
    private sealed class FrozenClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => DateTimeOffset.FromUnixTimeSeconds(1_800_000_000);
    }

    [Fact]
    public void Hmac_is_accepted_by_existing_Csharp_contract()
    {
        var settings = Config(); var mapped = settings.Resolve(settings.Authority, "stable-001")!;
        var token = InternalBearer.Issue(mapped, settings.SigningSecret);
        Assert.Equal(new ReliableJobs.AudioIdentity("alpha", "alice"),
            ReliableJobs.AudioIdentity.FromAuthorization("Bearer " + token, settings.SigningSecret));
        var payload = JsonDocument.Parse(Convert.FromBase64String(token.Split('.')[0].Replace('-', '+').Replace('_', '/').PadRight((token.Split('.')[0].Length + 3) / 4 * 4, '=')));
        Assert.Equal(3, payload.RootElement.EnumerateObject().Count());
    }
}
