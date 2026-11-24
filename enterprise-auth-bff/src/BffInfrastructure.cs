using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Xml.Linq;
using Microsoft.AspNetCore.DataProtection;
using Npgsql;

namespace EnterpriseAuthBff;

// Linux-only first slice: do not assume Unix modes are equivalent to Windows ACLs.
// Paths are trusted operator input, never HTTP values. Operators must protect the
// ancestor directories against replacement; symlinks are rejected at every level.
public sealed class BffInfrastructure : IDisposable
{
    public const string ApplicationName = "EnterpriseAuthBff.EP12B.v1";
    private readonly string keys;
    private readonly string pfx;
    private readonly byte[] fingerprint;
    private readonly X509Certificate2 certificate;
    private readonly string dsn;
    private BffInfrastructure(string keys, string pfx, X509Certificate2 certificate, string dsn)
    {
        this.keys = keys; this.pfx = pfx; this.certificate = certificate; this.dsn = dsn;
        fingerprint = SHA256.HashData(File.ReadAllBytes(pfx));
    }
    public static BffInfrastructure Load(IConfiguration configuration)
    {
        try
        {
            string Read(string name) => !string.IsNullOrWhiteSpace(configuration[name])
                ? configuration[name]! : throw new InvalidOperationException();
            var keys = Read("EP12_DP_KEYS_DIR"); var pfx = Read("EP12_DP_CERT_PFX");
            var password = Read("EP12_DP_CERT_PASSWORD");
            if (password.Length < 16) throw new InvalidOperationException();
            CheckPath(keys, true); CheckPath(pfx, false);
            var cs = new NpgsqlConnectionStringBuilder(Read("EP12_SESSION_DSN"));
            // Bounded local deployment only. No implicit OS credentials, remote
            // plaintext transport, multi-host discovery or caller-selected schema.
            if (cs.Host is not ("127.0.0.1" or "localhost" or "::1") ||
                string.IsNullOrWhiteSpace(cs.Database) || string.IsNullOrWhiteSpace(cs.Username) ||
                (cs.Password?.Length ?? 0) < 16 || cs.SearchPath != null || !string.IsNullOrEmpty(cs.Options) || cs.LogParameters || cs.IncludeErrorDetail)
                throw new InvalidOperationException();
            cs.Timeout = 5; cs.CommandTimeout = 5;
            var cert = X509CertificateLoader.LoadPkcs12FromFile(pfx, password, X509KeyStorageFlags.EphemeralKeySet);
            try
            {
                using var rsa = cert.GetRSAPrivateKey();
                if (rsa == null || rsa.KeySize < 2048 || cert.NotBefore.ToUniversalTime() > DateTime.UtcNow ||
                    cert.NotAfter.ToUniversalTime() <= DateTime.UtcNow.AddDays(1)) throw new InvalidOperationException();
                var result = new BffInfrastructure(keys, pfx, cert, cs.ConnectionString);
                result.CheckFiles();
                return result;
            }
            catch { cert.Dispose(); throw; }
        }
        catch (Exception)
        {
            throw new InvalidOperationException("Invalid EP-12 session infrastructure configuration.");
        }
    }
    public void CheckFiles()
    {
        CheckPath(keys, true); CheckPath(pfx, false);
        if (certificate.NotAfter.ToUniversalTime() <= DateTime.UtcNow ||
            !CryptographicOperations.FixedTimeEquals(fingerprint, SHA256.HashData(File.ReadAllBytes(pfx))))
            throw new InvalidOperationException("Session key infrastructure unavailable.");
        foreach (var entry in Directory.EnumerateFileSystemEntries(keys))
        {
            CheckPath(entry, false);
            if (Path.GetFileName(entry).StartsWith("key-", StringComparison.Ordinal))
            {
                var xml = XDocument.Load(entry);
                if (!xml.Descendants().Any(e => e.Name.LocalName == "encryptedSecret") ||
                    xml.Descendants().Any(e => e.Name.LocalName == "masterKey"))
                    throw new InvalidOperationException("Unprotected session key ring.");
            }
        }
    }
    private static void CheckPath(string path, bool directory)
    {
        if (!OperatingSystem.IsLinux() || !Path.IsPathFullyQualified(path) || Path.GetFullPath(path) != path)
            throw new InvalidOperationException();
        for (var current = path; current != null; current = Path.GetDirectoryName(current))
        {
            LinuxOwnership.RequireTrustedOwner(current, current == path);
            var attributes = File.GetAttributes(current);
            if ((attributes & FileAttributes.ReparsePoint) != 0) throw new InvalidOperationException();
            if (current == path)
            {
                if (((attributes & FileAttributes.Directory) != 0) != directory) throw new InvalidOperationException();
                var expected = directory ? UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute
                    : UnixFileMode.UserRead | UnixFileMode.UserWrite;
                if (File.GetUnixFileMode(current) != expected) throw new InvalidOperationException();
            }
            else
            {
                var mode = File.GetUnixFileMode(current);
                // /tmp's sticky bit protects owned children; writable non-sticky
                // ancestors permit path substitution and are not trusted.
                if ((mode & (UnixFileMode.GroupWrite | UnixFileMode.OtherWrite)) != 0 &&
                    (mode & UnixFileMode.StickyBit) == 0) throw new InvalidOperationException();
            }
            if (current == "/") break;
        }
    }
    public void Probe(IDataProtectionProvider provider)
    {
        CheckFiles();
        var protector = provider.CreateProtector("EP12B.StartupProbe");
        if (protector.Unprotect(protector.Protect("probe")) != "probe") throw new InvalidOperationException();
        CheckFiles();
    }
    public void Configure(IServiceCollection services)
    {
        services.AddSingleton(this);
        services.AddDataProtection().SetApplicationName(ApplicationName)
            .PersistKeysToFileSystem(new DirectoryInfo(keys)).ProtectKeysWithCertificate(certificate);
        services.AddSingleton(_ => NpgsqlDataSource.Create(dsn));
        services.AddSingleton<PostgresSessionRegistry>();
        services.AddSingleton<ISessionRegistry>(sp => sp.GetRequiredService<PostgresSessionRegistry>());
    }
    public void Dispose() => certificate.Dispose();
}
