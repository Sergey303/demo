using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Server.Kestrel.Core;

namespace EnterpriseAuthBff;

// One local proxy under the service EUID, never an IP-based proxy trust policy.
public sealed class BffTransport
{
    public static BffTransport Direct { get; } = new(null);
    public string? SocketPath { get; }
    private (ulong Inode, uint Major, uint Minor, ushort Mode)? identity;
    private volatile bool ready;
    private BffTransport(string? path) { SocketPath = path; }
    [DllImport("libc", EntryPoint = "umask")]
    private static extern uint Umask(uint mask);

    public static BffTransport Load(IConfiguration configuration)
    {
        var mode = configuration["EP12_TRANSPORT"];
        if (mode is null or "direct-https")
        {
            if (configuration["EP12_PROXY_SOCKET_PATH"] != null) throw new InvalidOperationException("Socket requires proxy transport.");
            return Direct;
        }
        if (mode != "trusted-uds-proxy" || !OperatingSystem.IsLinux()) throw new InvalidOperationException("Invalid transport.");
        RejectEndpoints(configuration);
        var path = configuration["EP12_PROXY_SOCKET_PATH"];
        if (path == null || !Path.IsPathFullyQualified(path) || Path.GetFullPath(path) != path ||
            System.Text.Encoding.UTF8.GetByteCount(path) > 100 ||
            !Regex.IsMatch(Path.GetFileName(path), @"\A[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}\.sock\z"))
            throw new InvalidOperationException("Invalid socket path.");
        var result = new BffTransport(path);
        result.CheckParent();
        // Includes dangling symlinks and non-socket filesystem objects.
        if (Directory.EnumerateFileSystemEntries(Path.GetDirectoryName(path)!).Contains(path))
            throw new InvalidOperationException("Socket path already exists.");
        return result;
    }

    private static void RejectEndpoints(IConfiguration configuration)
    {
        foreach (var item in configuration.AsEnumerable())
        {
            var key = item.Key.ToUpperInvariant();
            if (key.StartsWith("ASPNETCORE_", StringComparison.Ordinal)) key = key[11..];
            if (key.StartsWith("DOTNET_", StringComparison.Ordinal)) key = key[7..];
            if (item.Value != null && (key is "URLS" or "HTTP_PORTS" or "HTTPS_PORTS" or "PREFERHOSTINGURLS" or "FORWARDEDHEADERS_ENABLED" or "LISTEN_FDS" or "LISTEN_PID" or "LISTEN_FDNAMES"
                || key is "LISTEN_FDS" or "LISTEN_PID" or "LISTEN_FDNAMES"
                || key.StartsWith("KESTREL:ENDPOINTS", StringComparison.Ordinal)))
                throw new InvalidOperationException("Additional listeners or forwarding are forbidden.");
        }
    }

    private void CheckParent()
    {
        if (!OperatingSystem.IsLinux()) throw new InvalidOperationException();
        var parent = Path.GetDirectoryName(SocketPath!)!;
        for (var current = parent; current != null; current = Path.GetDirectoryName(current))
        {
            if (current is "/tmp" or "/var/tmp" or "/dev/shm" || Directory.Exists(Path.Combine(current, ".git")) || File.Exists(Path.Combine(current, ".git")))
                throw new InvalidOperationException("Untrusted socket location.");
            if ((File.GetAttributes(current) & (FileAttributes.ReparsePoint | FileAttributes.Directory)) != FileAttributes.Directory)
                throw new InvalidOperationException("Socket ancestors must be real directories.");
            LinuxOwnership.RequireTrustedOwner(current, current == parent);
            var permissions = File.GetUnixFileMode(current);
            if (current == parent ? permissions != (UnixFileMode)448 :
                (permissions & (UnixFileMode.GroupWrite | UnixFileMode.OtherWrite)) != 0)
                throw new InvalidOperationException("Unsafe socket directory permissions.");
            if (current == "/") break;
        }
    }

    public void Configure(WebApplicationBuilder builder)
    {
        if (SocketPath == null) return;
        RejectEndpoints(builder.Configuration);
        CheckParent();
        foreach (var root in new[] { builder.Environment.ContentRootPath, builder.Environment.WebRootPath })
            if (!string.IsNullOrEmpty(root) && (SocketPath == Path.GetFullPath(root) ||
                SocketPath.StartsWith(Path.TrimEndingDirectorySeparator(Path.GetFullPath(root)) + "/", StringComparison.Ordinal)))
                throw new InvalidOperationException("Socket cannot reside in application roots.");
        if (Directory.EnumerateFileSystemEntries(Path.GetDirectoryName(SocketPath)!).Contains(SocketPath))
            throw new InvalidOperationException("Socket path already exists.");
        // Process-global and intentionally never restored. Called before Kestrel starts.
        Umask(63); // 0077; new socket has no group/other access, even during bind.
        builder.WebHost.ConfigureKestrel(options => {
            options.Configure(new ConfigurationBuilder().Build());
            options.ListenUnixSocket(SocketPath, listen => listen.Protocols = HttpProtocols.Http1);
        });
    }

    public void VerifyStarted()
    {
        if (SocketPath == null) return;
        if (!OperatingSystem.IsLinux()) throw new InvalidOperationException();
        CheckParent();
        var actual = LinuxOwnership.OwnedIdentity(SocketPath);
        if ((actual.Mode & 0xf000) != 0xc000 || (actual.Mode & 0x3f) != 0 ||
            (File.GetUnixFileMode(SocketPath) is not ((UnixFileMode)448) and not ((UnixFileMode)384)))
            throw new InvalidOperationException("Unsafe proxy socket.");
        identity = actual;
        ready = true;
    }

    public bool Validate(HttpContext context, string origin)
    {
        if (SocketPath == null) return true; // Direct path never consumes forwarding metadata.
        if (!ready || context.Request.IsHttps) return false;
        CheckParent();
        if (LinuxOwnership.OwnedIdentity(SocketPath) != identity) return false;
        var host = origin[8..];
        if (context.Request.Host.Value != host) return false;
        foreach (var header in context.Request.Headers.Keys)
            if (header.Equals("Forwarded", StringComparison.OrdinalIgnoreCase) ||
                header.StartsWith("X-Original-", StringComparison.OrdinalIgnoreCase) ||
                (header.StartsWith("X-Forwarded-", StringComparison.OrdinalIgnoreCase) &&
                 !header.Equals("X-Forwarded-Proto", StringComparison.OrdinalIgnoreCase) &&
                 !header.Equals("X-Forwarded-Host", StringComparison.OrdinalIgnoreCase))) return false;
        bool One(string name, string expected) => context.Request.Headers.TryGetValue(name, out var values) &&
            values.Count == 1 && values[0] == expected;
        if (!One("X-Forwarded-Proto", "https") || !One("X-Forwarded-Host", host)) return false;
        context.Request.Scheme = "https";
        return true;
    }

    public void Cleanup()
    {
        ready = false;
        if (SocketPath == null || identity == null) return;
        try
        {
            CheckParent();
            if (LinuxOwnership.OwnedIdentity(SocketPath) == identity) File.Delete(SocketPath);
        }
        catch (Exception) { /* Never unlink a replacement/unknown file. Operator must inspect it. */ }
    }
}
