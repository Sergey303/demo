using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace EnterpriseAuthBff;

// Trusted startup snapshot: never bind any part of this configuration from HTTP.
public sealed class BffSettings
{
    public required string Authority { get; init; }
    public required string ClientId { get; init; }
    public required string ClientSecret { get; init; }
    public required string PublicOrigin { get; init; }
    public required string SigningSecret { get; init; }
    public required IReadOnlyList<MappedPrincipal> Principals { get; init; }

    public static BffSettings Load(IConfiguration configuration)
    {
        try
        {
            string Read(string name) => !string.IsNullOrWhiteSpace(configuration[name])
                ? configuration[name]! : throw new InvalidOperationException();
            if (string.Equals(configuration["ASPNETCORE_FORWARDEDHEADERS_ENABLED"], "true", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException();
            var authority = Read("EP12_AUTHORITY");
            var origin = Read("EP12_PUBLIC_ORIGIN");
            if (!HttpsUri(authority, false) || !HttpsUri(origin, true)) throw new InvalidOperationException();
            var id = Read("EP12_CLIENT_ID"); var secret = Read("EP12_CLIENT_SECRET");
            var signing = Read("DEMO_AUTH_SECRET");
            if (id.Length > 512 || secret.Length > 4096 || id.Any(char.IsControl) || secret.Any(char.IsControl)
                || Encoding.UTF8.GetByteCount(signing) < 32) throw new InvalidOperationException();
            var entries = JsonSerializer.Deserialize<MappedPrincipal[]>(Read("EP12_PRINCIPALS"), new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = false, UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
            });
            if (entries is not { Length: > 0 and <= 1000 } || entries.Any(p => p is null ||
                p.Issuer != authority || p.Sub is not { Length: > 0 and <= 255 } ||
                p.Sub.Any(c => c < 0x21 || c > 0x7e) || !Identifier(p.Tenant) || !Identifier(p.Subject)) ||
                entries.Select(p => (p.Issuer, p.Sub)).Distinct().Count() != entries.Length)
                throw new InvalidOperationException();
            return new BffSettings { Authority = authority, PublicOrigin = origin, ClientId = id,
                ClientSecret = secret, SigningSecret = signing, Principals = Array.AsReadOnly(entries) };
        }
        catch (Exception ex) when (ex is InvalidOperationException or JsonException or ArgumentException)
        {
            // Deliberately don't include configuration values or parser exception details.
            throw new InvalidOperationException("Invalid EP-12 BFF configuration. See enterprise-demo/EP12-OIDC-BFF.md.");
        }
    }

    private static bool HttpsUri(string text, bool origin) => Uri.TryCreate(text, UriKind.Absolute, out var uri)
        && uri.Scheme == "https" && uri.UserInfo == "" && uri.Query == "" && uri.Fragment == ""
        && uri.Host.Length > 0 && !text.Contains('\\') &&
        (origin ? text == uri.GetLeftPart(UriPartial.Authority) : text == uri.GetLeftPart(UriPartial.Path).TrimEnd('/'));
    private static bool Identifier(string? value) => value != null && Regex.IsMatch(value, "\\A[A-Za-z0-9._-]{1,128}\\z", RegexOptions.CultureInvariant);

    public MappedPrincipal? Resolve(string? issuer, string? sub) =>
        Principals.SingleOrDefault(p => p.Issuer == issuer && p.Sub == sub);

    public MappedPrincipal? FromCookie(ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true) return null;
        string? One(string type)
        {
            var values = principal.FindAll(type).ToArray();
            return values.Length == 1 ? values[0].Value : null;
        }
        var mapped = Resolve(One("bff_issuer"), One("bff_oidc_sub"));
        return mapped != null && mapped.Tenant == One("bff_tenant") && mapped.Subject == One("bff_subject") ? mapped : null;
    }
}

public sealed record MappedPrincipal(
    [property: JsonPropertyName("issuer")] string Issuer,
    [property: JsonPropertyName("sub")] string Sub,
    [property: JsonPropertyName("tenant")] string Tenant,
    [property: JsonPropertyName("subject")] string Subject)
{
    public ClaimsPrincipal Principal() => new(new ClaimsIdentity(new[] {
        new Claim("bff_issuer", Issuer), new Claim("bff_oidc_sub", Sub),
        new Claim("bff_tenant", Tenant), new Claim("bff_subject", Subject)
    }, BffApplication.CookieScheme));
}
