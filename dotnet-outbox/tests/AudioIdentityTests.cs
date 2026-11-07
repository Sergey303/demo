using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ReliableJobs;
using Xunit;

public class AudioIdentityTests
{
    private const string Secret = "unit-test-secret-only-long-enough-1234567890";

    private static string Token(string tenant = "team-a", string subject = "alice", long? expiry = null)
    {
        var payload = JsonSerializer.Serialize(new { tenant, sub = subject,
            exp = expiry ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 300 });
        var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(payload)).TrimEnd('=')
            .Replace('+', '-').Replace('/', '_');
        var signature = Convert.ToBase64String(HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(Secret), Encoding.ASCII.GetBytes(encoded)))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');
        return "Bearer " + encoded + "." + signature;
    }

    [Fact]
    public void SignedIdentityIsAccepted()
    {
        var identity = AudioIdentity.FromAuthorization(Token(), Secret);
        Assert.Equal("team-a", identity?.Tenant);
        Assert.Equal("alice", identity?.Subject);
    }

    [Fact]
    public void InvalidIdentityIsRejectedWithoutFallback()
    {
        Assert.Null(AudioIdentity.FromAuthorization(null, Secret));
        Assert.Null(AudioIdentity.FromAuthorization(Token(), null));
        Assert.Null(AudioIdentity.FromAuthorization(Token(), "short"));
        Assert.Null(AudioIdentity.FromAuthorization(Token() + "x", Secret));
        Assert.Null(AudioIdentity.FromAuthorization(Token("team-a", "bad/subject"), Secret));
        Assert.Null(AudioIdentity.FromAuthorization(Token(expiry: DateTimeOffset.UtcNow.ToUnixTimeSeconds() - 10), Secret));
        Assert.Null(AudioIdentity.FromAuthorization(Token(expiry: DateTimeOffset.UtcNow.ToUnixTimeSeconds() + 3700), Secret));
    }
}
