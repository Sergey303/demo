using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using EnterpriseAuthBff;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EnterpriseAuthBff.Tests;

public class KeyRingTests
{
    [Fact]
    public void Persistent_ring_is_encrypted_survives_restart_and_other_ring_cannot_unprotect()
    {
        using var files = new SecureFiles();
        string protectedText;
        using (var infrastructure = files.Load())
        using (var services = Services(infrastructure))
        {
            infrastructure.Probe(services.GetRequiredService<IDataProtectionProvider>());
            protectedText = services.GetRequiredService<IDataProtectionProvider>().CreateProtector("test-session").Protect("private-cookie-marker");
        }
        var xml = File.ReadAllText(Directory.GetFiles(files.Keys, "key-*.xml").Single());
        Assert.Contains("encryptedSecret", xml); Assert.Contains("EncryptedKey", xml);
        Assert.DoesNotContain("<value>", xml); Assert.DoesNotContain("private-cookie-marker", xml);
        using (var infrastructure = files.Load())
        using (var services = Services(infrastructure))
            Assert.Equal("private-cookie-marker", services.GetRequiredService<IDataProtectionProvider>().CreateProtector("test-session").Unprotect(protectedText));
        using var other = new SecureFiles(); using var different = other.Load(); using var independent = Services(different);
        Assert.Throws<CryptographicException>(() => independent.GetRequiredService<IDataProtectionProvider>().CreateProtector("test-session").Unprotect(protectedText));
    }

    [Theory]
    [InlineData("EP12_SESSION_DSN")]
    [InlineData("EP12_DP_KEYS_DIR")]
    [InlineData("EP12_DP_CERT_PFX")]
    [InlineData("EP12_DP_CERT_PASSWORD")]
    public void Missing_configuration_never_falls_back(string key)
    {
        using var files = new SecureFiles(); var values = files.Values(); values.Remove(key);
        var error = Assert.Throws<InvalidOperationException>(() => files.Load(values));
        Assert.Equal("Invalid EP-12 session infrastructure configuration.", error.Message);
        Assert.Null(error.InnerException);
    }

    [Theory]
    [InlineData("directory-mode")]
    [InlineData("pfx-mode")]
    [InlineData("pfx-symlink")]
    [InlineData("directory-symlink")]
    [InlineData("parent-symlink")]
    [InlineData("wrong-password")]
    [InlineData("short-password")]
    [InlineData("no-private-key")]
    [InlineData("weak-rsa")]
    [InlineData("expired")]
    [InlineData("ec-key")]
    [InlineData("malformed-pfx")]
    [InlineData("remote-dsn")]
    [InlineData("malformed-dsn")]
    [InlineData("leaky-dsn")]
    [InlineData("relative-path")]
    [InlineData("dsn-options")]
    [InlineData("weak-dsn-password")]
    public void Insecure_configuration_is_rejected_without_values(string failure)
    {
        using var files = new SecureFiles(); var values = files.Values();
        switch (failure)
        {
            case "directory-mode": File.SetUnixFileMode(files.Keys, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute | UnixFileMode.GroupRead); break;
            case "pfx-mode": File.SetUnixFileMode(files.Pfx, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.OtherRead); break;
            case "directory-symlink": Directory.Move(files.Keys, files.Keys + "-real"); Directory.CreateSymbolicLink(files.Keys, files.Keys + "-real"); break;
            case "pfx-symlink": File.Move(files.Pfx, files.Pfx + "-real"); File.CreateSymbolicLink(files.Pfx, files.Pfx + "-real"); break;
            case "parent-symlink": Directory.CreateSymbolicLink(files.Root + "-link", files.Root); values["EP12_DP_KEYS_DIR"] = files.Root + "-link/keys"; break;
            case "wrong-password": values["EP12_DP_CERT_PASSWORD"] = "secret-marker-wrong-password"; break;
            case "short-password": values["EP12_DP_CERT_PASSWORD"] = "weak"; break;
            case "no-private-key": files.WriteCertificate(privateKey: false); break;
            case "weak-rsa": files.WriteCertificate(bits: 1024); break;
            case "expired": files.WriteCertificate(expired: true); break;
            case "ec-key": files.WriteCertificate(ec: true); break;
            case "malformed-pfx": File.WriteAllText(files.Pfx, "secret-marker"); break;
            case "remote-dsn": values["EP12_SESSION_DSN"] = "Host=remote.test;Database=sessions;Username=bff;Password=secret-marker"; break;
            case "malformed-dsn": values["EP12_SESSION_DSN"] = "secret-marker"; break;
            case "leaky-dsn": values["EP12_SESSION_DSN"] += ";Include Error Detail=true"; break;
            case "dsn-options": values["EP12_SESSION_DSN"] += ";Options=-c search_path=other"; break;
            case "weak-dsn-password": values["EP12_SESSION_DSN"] = "Host=127.0.0.1;Database=sessions;Username=bff;Password=short"; break;
            case "relative-path": values["EP12_DP_KEYS_DIR"] = "keys"; break;
        }
        try
        {
            var error = Assert.Throws<InvalidOperationException>(() => files.Load(values));
            Assert.DoesNotContain("secret-marker", error.ToString()); Assert.Null(error.InnerException);
        }
        finally { if (Directory.Exists(files.Root + "-link")) Directory.Delete(files.Root + "-link"); }
    }

    [Fact]
    public void Runtime_file_removal_and_permission_change_fail_closed()
    {
        using var files = new SecureFiles(); using var infrastructure = files.Load();
        File.SetUnixFileMode(files.Pfx, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.GroupRead);
        Assert.ThrowsAny<Exception>(infrastructure.CheckFiles);
        File.Delete(files.Pfx); Assert.ThrowsAny<Exception>(infrastructure.CheckFiles);
    }
    [Fact]
    public void Existing_plaintext_key_ring_is_rejected()
    {
        using var files = new SecureFiles();
        var provider = DataProtectionProvider.Create(new DirectoryInfo(files.Keys));
        provider.CreateProtector("plaintext").Protect("marker");
        Assert.Throws<InvalidOperationException>(() => files.Load());
    }

    [Fact]
    public async Task Runtime_certificate_loss_denies_request_before_proxy()
    {
        using var files = new SecureFiles(); using var infrastructure = files.Load();
        await using var host = await Harness.Start(b => b.Services.AddSingleton(infrastructure));
        var cookie = host.Cookie(); File.Delete(files.Pfx);
        using var request = new HttpRequestMessage(System.Net.Http.HttpMethod.Get, "/enterprise-api/ready");
        request.Headers.Add("Cookie", cookie);
        var response = await host.Client.SendAsync(request);
        Assert.Equal(System.Net.HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(0, host.Outbound.Calls);
    }

    [Fact]
    public void Production_composition_has_no_missing_infrastructure_fallback()
    {
        var builder = Microsoft.AspNetCore.Builder.WebApplication.CreateBuilder();
        builder.Configuration.Sources.Clear();
        Assert.Throws<InvalidOperationException>(() => BffApplication.AddServices(builder, BoundaryTests.Config()));
    }

    internal static ServiceProvider Services(BffInfrastructure infrastructure)
    {
        var services = new ServiceCollection(); services.AddLogging(); infrastructure.Configure(services); return services.BuildServiceProvider();
    }
}

internal sealed class SecureFiles : IDisposable
{
    public string Root { get; } = Path.Combine(Path.GetTempPath(), "ep12b-keys-" + Guid.NewGuid().ToString("N"));
    public string Keys => Path.Combine(Root, "keys");
    public string Pfx => Path.Combine(Root, "certificate.pfx");
    private readonly string password = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
    public SecureFiles()
    {
        Directory.CreateDirectory(Root, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        Directory.CreateDirectory(Keys, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        WriteCertificate();
    }
    public void WriteCertificate(bool privateKey = true, int bits = 2048, bool expired = false, bool ec = false)
    {
        using var rsa = RSA.Create(bits); using var ecc = ECDsa.Create();
        var request = ec ? new CertificateRequest("CN=ep12b-test", ecc, HashAlgorithmName.SHA256)
            : new CertificateRequest("CN=ep12b-test", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        using var cert = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-2), DateTimeOffset.UtcNow.AddDays(expired ? -1 : 30));
        using var publicOnly = X509CertificateLoader.LoadCertificate(cert.Export(X509ContentType.Cert));
        File.WriteAllBytes(Pfx, (privateKey ? cert : publicOnly).Export(X509ContentType.Pfx, password));
        File.SetUnixFileMode(Pfx, UnixFileMode.UserRead | UnixFileMode.UserWrite);
    }
    public Dictionary<string, string?> Values() => new() {
        ["EP12_DP_KEYS_DIR"] = Keys, ["EP12_DP_CERT_PFX"] = Pfx, ["EP12_DP_CERT_PASSWORD"] = password,
        ["EP12_SESSION_DSN"] = "Host=127.0.0.1;Database=ep12_sessions;Username=bff;Password=test-only-long-password"
    };
    public BffInfrastructure Load(Dictionary<string, string?>? values = null) => BffInfrastructure.Load(new ConfigurationBuilder().AddInMemoryCollection(values ?? Values()).Build());
    public void Dispose() { if (Directory.Exists(Root)) Directory.Delete(Root, true); }
}

public sealed class RootLinuxFactAttribute : FactAttribute
{
    [System.Runtime.InteropServices.DllImport("libc", EntryPoint = "geteuid")]
    private static extern uint EffectiveUid();
    public RootLinuxFactAttribute()
    {
        if (!OperatingSystem.IsLinux() || EffectiveUid() != 0 ||
            (Convert.ToUInt64(File.ReadLines("/proc/self/status").Single(l => l.StartsWith("CapEff:")).Split(':')[1].Trim(), 16) & 1) == 0)
            Skip = "Ownership substitution fixture requires Linux CAP_CHOWN (not available in every root container).";
    }
}

public class KeyOwnershipTests
{
    [Theory]
    [InlineData(1000u, 1000u, true, true)]
    [InlineData(0u, 1000u, true, false)]
    [InlineData(1001u, 1000u, true, false)]
    [InlineData(1001u, 0u, true, false)]
    [InlineData(1001u, 0u, false, false)]
    [InlineData(0u, 1000u, false, true)]
    [InlineData(1000u, 1000u, false, true)]
    public void Ownership_policy_rejects_foreign_secrets_and_ancestors(uint owner, uint service, bool secret, bool expected)
        => Assert.Equal(expected, LinuxOwnership.Trusted(owner, service, secret));

    [RootLinuxFact]
    public void Foreign_owned_secret_file_or_directory_is_rejected_even_with_exact_modes()
    {
        using var files = new SecureFiles();
        foreach (var path in new[] { files.Pfx, files.Keys, files.Root })
        {
            Assert.Equal(0, Chown(path, 65534, 65534));
            try { Assert.Throws<InvalidOperationException>(() => files.Load()); }
            finally { Assert.Equal(0, Chown(path, 0, 0)); }
        }
    }
    [System.Runtime.InteropServices.DllImport("libc", EntryPoint = "chown", SetLastError = true)]
    private static extern int Chown(string path, uint owner, uint group);
}
