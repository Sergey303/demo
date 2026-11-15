using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;

namespace EnterpriseAuthBff;

public static class InternalBearer
{
    public static string Issue(MappedPrincipal principal, string secret, TimeProvider? clock = null)
    {
        var payload = WebEncoders.Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(new {
            tenant = principal.Tenant, sub = principal.Subject, exp = (clock ?? TimeProvider.System).GetUtcNow().ToUnixTimeSeconds() + 300
        }));
        return payload + "." + WebEncoders.Base64UrlEncode(HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(secret), Encoding.ASCII.GetBytes(payload)));
    }
}
