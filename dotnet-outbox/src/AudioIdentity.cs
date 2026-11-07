using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ReliableJobs;

/// <summary>
/// Narrow demo auth boundary. Tokens are issued OFFLINE by a trusted identity
/// component, never by this HTTP API. Replace with OIDC/JWT validation for prod.
/// </summary>
public sealed record AudioIdentity(string Tenant, string Subject)
{
    public static AudioIdentity? FromAuthorization(string? header, string? secret)
    {
        if (string.IsNullOrEmpty(header) || !header.StartsWith("Bearer ", StringComparison.Ordinal)
            || string.IsNullOrEmpty(secret) || Encoding.UTF8.GetByteCount(secret) < 32)
            return null;
        var token = header["Bearer ".Length..];
        if (token.Length > 4096) return null;
        var parts = token.Split('.');
        if (parts.Length != 2 || parts[0].Length == 0 || parts[1].Length == 0) return null;
        try
        {
            var actual = Decode(parts[1]);
            var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.ASCII.GetBytes(parts[0]));
            if (!CryptographicOperations.FixedTimeEquals(expected, actual)) return null;
            using var document = JsonDocument.Parse(Decode(parts[0]));
            var obj = document.RootElement;
            if (obj.ValueKind != JsonValueKind.Object || obj.EnumerateObject().Count() != 3) return null;
            var tenant = obj.GetProperty("tenant").GetString();
            var subject = obj.GetProperty("sub").GetString();
            var expiry = obj.GetProperty("exp").GetInt64();
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            return IsIdentifier(tenant) && IsIdentifier(subject) && expiry > now && expiry <= now + 3600
                ? new AudioIdentity(tenant!, subject!)
                : null;
        }
        catch (Exception ex) when (ex is FormatException or JsonException or ArgumentException or OverflowException
                                   or InvalidOperationException or KeyNotFoundException)
        {
            return null;
        }
    }

    private static byte[] Decode(string encoded)
    {
        if (encoded.Length > 4096 || encoded.Length == 0 || encoded.Any(c =>
            !(c is >= 'A' and <= 'Z' or >= 'a' and <= 'z' or >= '0' and <= '9' or '-' or '_')))
            throw new FormatException();
        var value = encoded.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(value.PadRight((value.Length + 3) / 4 * 4, '='));
    }

    private static bool IsIdentifier(string? id) => id is { Length: >= 1 and <= 128 } &&
        id.All(c => c is >= 'A' and <= 'Z' or >= 'a' and <= 'z' or >= '0' and <= '9' or '.' or '_' or '-');
}
