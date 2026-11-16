using Microsoft.Extensions.DependencyInjection;
using EnterpriseAuthBff;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace EnterpriseAuthBff.Tests;

public class UdsTransportTests
{
    [Theory]
    [InlineData("EP12_TRANSPORT", "unknown")]
    [InlineData("ASPNETCORE_FORWARDEDHEADERS_ENABLED", "false")]
    public void Invalid_transport_configuration_is_rejected(string key, string value)
    {
        var values = BoundaryTests.Settings(); values[key] = value;
        Assert.Throws<InvalidOperationException>(() => BoundaryTests.Config(values));
    }
}

// Real kernel AF_UNIX transport; no TestServer and no database connection.
public class RealUdsTests
{
    private static string NewDirectory()
    {
        var root = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var dir = Path.Combine(root, "ep12d-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir, (UnixFileMode)448);
        return dir;
    }
    private static Dictionary<string, string?> Values(string path)
    {
        var values = BoundaryTests.Settings();
        values["EP12_TRANSPORT"] = "trusted-uds-proxy"; values["EP12_PROXY_SOCKET_PATH"] = path;
        return values;
    }
    [Theory]
    [InlineData("ASPNETCORE_URLS")]
    [InlineData("urls")]
    [InlineData("HTTP_PORTS")]
    [InlineData("ASPNETCORE_HTTPS_PORTS")]
    [InlineData("DOTNET_URLS")]
    [InlineData("LISTEN_FDS")]
    [InlineData("LISTEN_PID")]
    [InlineData("LISTEN_FDNAMES")]
    [InlineData("Kestrel:Endpoints:Injected:Url")]
    public void Extra_listeners_fail_closed(string key)
    {
        var dir = NewDirectory();
        try { var values = Values(dir + "/bff.sock"); values[key] = "http://127.0.0.1:5000";
            Assert.Throws<InvalidOperationException>(() => BoundaryTests.Config(values)); }
        finally { Directory.Delete(dir, true); }
    }
    [Fact]
    public void Unsafe_filesystem_paths_are_rejected()
    {
        var dir = NewDirectory();
        try
        {
            foreach (var path in new[] { "relative.sock", "/tmp/bff.sock", dir + "/../bff.sock", dir + "/bad.name.sock", dir + "/missing/bff.sock" })
                Assert.ThrowsAny<Exception>(() => BoundaryTests.Config(Values(path)));
            File.WriteAllText(dir + "/bff.sock", "unknown");
            Assert.ThrowsAny<Exception>(() => BoundaryTests.Config(Values(dir + "/bff.sock")));
            File.Delete(dir + "/bff.sock");
            File.CreateSymbolicLink(dir + "/bff.sock", dir + "/absent");
            Assert.ThrowsAny<Exception>(() => BoundaryTests.Config(Values(dir + "/bff.sock")));
            File.Delete(dir + "/bff.sock");
            Directory.CreateSymbolicLink(dir + "/link", dir);
            Assert.ThrowsAny<Exception>(() => BoundaryTests.Config(Values(dir + "/link/bff.sock")));
            File.SetUnixFileMode(dir, (UnixFileMode)493);
            Assert.ThrowsAny<Exception>(() => BoundaryTests.Config(Values(dir + "/bff.sock")));
        }
        finally { Directory.Delete(dir, true); }
    }

    [Fact]
    public async Task Real_Kestrel_sole_socket_checks_headers_before_auth_and_challenges_with_secure_origin()
    {
        var dir = NewDirectory(); var path = dir + "/bff.sock";
        var builder = Microsoft.AspNetCore.Builder.WebApplication.CreateBuilder();
        builder.Configuration.Sources.Clear(); builder.Configuration.AddInMemoryCollection(Values(path));
        var settings = BffSettings.Load(builder.Configuration);
        settings.Transport.Configure(builder);
        using var provider = new FakeProvider();
        BffApplication.AddServices(builder, settings, new MemorySessionRegistry());
        builder.Services.Configure<Microsoft.AspNetCore.Authentication.OpenIdConnect.OpenIdConnectOptions>(BffApplication.OidcScheme,
            o => o.Backchannel = new HttpClient(provider));
        await using var app = builder.Build();
        BffApplication.Configure(app, settings);
        try
        {
            await app.StartAsync();
            using var handler = new SocketsHttpHandler { AllowAutoRedirect = false, UseCookies = false, UseProxy = false,
                ConnectCallback = async (_, token) => {
                    var socket = new System.Net.Sockets.Socket(System.Net.Sockets.AddressFamily.Unix, System.Net.Sockets.SocketType.Stream, System.Net.Sockets.ProtocolType.Unspecified);
                    try { await socket.ConnectAsync(new System.Net.Sockets.UnixDomainSocketEndPoint(path), token); return new System.Net.Sockets.NetworkStream(socket, true); }
                    catch { socket.Dispose(); throw; }
                } };
            using var client = new HttpClient(handler) { BaseAddress = new Uri("http://bff.example.test") };
            async Task<HttpResponseMessage> Send(string? proto = "https", string host = "bff.example.test", string? extra = null, string target = "/auth/session")
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, target);
                request.Headers.Host = host;
                if (proto != null) request.Headers.TryAddWithoutValidation("X-Forwarded-Proto", proto);
                request.Headers.TryAddWithoutValidation("X-Forwarded-Host", "bff.example.test");
                if (extra != null) request.Headers.TryAddWithoutValidation(extra, "spoof");
                return await client.SendAsync(request);
            }
            Assert.Equal(System.Net.HttpStatusCode.BadRequest, (await Send()).StatusCode); // startup gate
            settings.Transport.VerifyStarted();
            Assert.Equal((UnixFileMode)448, File.GetUnixFileMode(path));
            Assert.All(app.Urls, url => Assert.StartsWith("http://unix:", url));
            Assert.Single(app.Urls);
            Assert.Equal(System.Net.HttpStatusCode.Unauthorized, (await Send()).StatusCode);
            foreach (var proto in new string?[] { null, "http", "https,https", "https, http", "HTTPS", "https\nspoof" })
                Assert.Equal(System.Net.HttpStatusCode.BadRequest, (await Send(proto)).StatusCode);
            Assert.Equal(System.Net.HttpStatusCode.BadRequest, (await Send(host: "evil.test")).StatusCode);
            foreach (var header in new[] { "Forwarded", "X-Forwarded-For", "X-Forwarded-Prefix", "X-Forwarded-Port", "X-Original-Host", "X-Original-URL" })
                Assert.Equal(System.Net.HttpStatusCode.BadRequest, (await Send(extra: header, target: "/auth/login")).StatusCode);
            async Task<string> Raw(string headers)
            {
                using var socket = new System.Net.Sockets.Socket(System.Net.Sockets.AddressFamily.Unix, System.Net.Sockets.SocketType.Stream, System.Net.Sockets.ProtocolType.Unspecified);
                await socket.ConnectAsync(new System.Net.Sockets.UnixDomainSocketEndPoint(path));
                using var stream = new System.Net.Sockets.NetworkStream(socket, false);
                await stream.WriteAsync(System.Text.Encoding.ASCII.GetBytes("GET /auth/login HTTP/1.1\r\nHost: bff.example.test\r\nConnection: close\r\n" + headers + "\r\n"));
                using var reader = new StreamReader(stream);
                return await reader.ReadToEndAsync();
            }
            foreach (var headers in new[] {
                "", // plain HTTP without proxy metadata
                "X-Forwarded-Proto: https\r\nX-Forwarded-Proto: https\r\nX-Forwarded-Host: bff.example.test\r\n",
                "X-Forwarded-Proto: https\r\nX-Forwarded-Host: bff.example.test\r\nX-Forwarded-Host: bff.example.test\r\n",
                "X-Forwarded-Proto: https\r\nX-Forwarded-Host: bff.example.test, evil.test\r\n",
                "X-Forwarded-Proto: https\r\nX-Forwarded-Host: evil.test\r\n",
                "X-Forwarded-Proto: https\r\nX-Forwarded-Host: bff.example.test\r\nX-Forwarded-For: spoof\r\n",
                "X-Forwarded-Proto: https\r\nX-Forwarded-Host: bff.example.test\r\nBad Header: invalid\r\n"
            }) Assert.StartsWith("HTTP/1.1 400", await Raw(headers));
            Assert.Equal(0, provider.Redemptions);
            var login = await Send(target: "/auth/login");
            Assert.Equal(System.Net.HttpStatusCode.Redirect, login.StatusCode);
            var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(login.Headers.Location!.Query);
            Assert.Equal("https://bff.example.test/signin-oidc", query["redirect_uri"]);
            Assert.Equal("S256", query["code_challenge_method"]);
            Assert.Equal("query", app.Services.GetRequiredService<Microsoft.Extensions.Options.IOptionsMonitor<Microsoft.AspNetCore.Authentication.OpenIdConnect.OpenIdConnectOptions>>().Get(BffApplication.OidcScheme).ResponseMode);
            Assert.All(login.Headers.GetValues("Set-Cookie"), cookie => Assert.Contains("secure", cookie));
            Assert.Equal(System.Net.HttpStatusCode.Forbidden, (await Send(target: "/auth/login?returnUrl=https://evil.test")).StatusCode);
            File.SetUnixFileMode(path, (UnixFileMode)438);
            Assert.Equal(System.Net.HttpStatusCode.BadRequest, (await Send()).StatusCode);
            File.SetUnixFileMode(path, (UnixFileMode)448);
        }
        finally { await app.StopAsync(); settings.Transport.Cleanup(); Directory.Delete(dir, true); }
    }
}

// Separate admission fixture over a real kernel socket, with synthetic trusted-proxy headers.
public class UdsAdmissionTests
{
    [Fact]
    public async Task Invalid_proxy_headers_do_not_spend_budget_and_XFF_never_partitions_it()
    {
        var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "ep12f-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir, (UnixFileMode)448);
        var values = BoundaryTests.Settings();
        values["EP12_TRANSPORT"] = "trusted-uds-proxy"; values["EP12_PROXY_SOCKET_PATH"] = dir + "/bff.sock";
        var builder = Microsoft.AspNetCore.Builder.WebApplication.CreateBuilder();
        builder.Configuration.Sources.Clear(); builder.Configuration.AddInMemoryCollection(values);
        var settings = BffSettings.Load(builder.Configuration);
        settings.Transport.Configure(builder);
        var registry = new ProbeRegistry();
        BffApplication.AddServices(builder, settings, registry);
        OidcAdmissionTests.SmallBudget(builder, 1, 1);
        using var provider = new FakeProvider();
        builder.Services.Configure<Microsoft.AspNetCore.Authentication.OpenIdConnect.OpenIdConnectOptions>(BffApplication.OidcScheme,
            o => o.Backchannel = new HttpClient(provider));
        await using var app = builder.Build();
        BffApplication.Configure(app, settings);
        try
        {
            await app.StartAsync(); settings.Transport.VerifyStarted();
            using var handler = new SocketsHttpHandler {
                AllowAutoRedirect = false, UseCookies = false, UseProxy = false,
                ConnectCallback = async (_, token) => {
                    var socket = new System.Net.Sockets.Socket(System.Net.Sockets.AddressFamily.Unix, System.Net.Sockets.SocketType.Stream, System.Net.Sockets.ProtocolType.Unspecified);
                    try { await socket.ConnectAsync(new System.Net.Sockets.UnixDomainSocketEndPoint(settings.Transport.SocketPath!), token); return new System.Net.Sockets.NetworkStream(socket, true); }
                    catch { socket.Dispose(); throw; }
                }
            };
            using var client = new HttpClient(handler) { BaseAddress = new Uri("http://bff.example.test") };
            async Task<HttpResponseMessage> Send(string? xff = null, string proto = "https", string host = "bff.example.test")
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, "/auth/login");
                request.Headers.Host = host;
                request.Headers.Add("X-Forwarded-Proto", proto);
                request.Headers.Add("X-Forwarded-Host", "bff.example.test");
                if (xff != null) request.Headers.Add("X-Forwarded-For", xff);
                return await client.SendAsync(request);
            }
            foreach (var xff in new[] { "203.0.113.1", "203.0.113.2" })
                Assert.Equal(System.Net.HttpStatusCode.BadRequest, (await Send(xff)).StatusCode);
            Assert.Equal(System.Net.HttpStatusCode.BadRequest, (await Send(proto: "http")).StatusCode);
            Assert.Equal(System.Net.HttpStatusCode.BadRequest, (await Send(host: "bff.example.test:444")).StatusCode);
            Assert.Equal(0, provider.Calls); Assert.Equal(0, registry.Calls);
            Assert.Equal(System.Net.HttpStatusCode.Redirect, (await Send()).StatusCode);
            var calls = provider.Calls;
            await OidcAdmissionTests.Rejected(await Send());
            Assert.Equal(System.Net.HttpStatusCode.BadRequest, (await Send("203.0.113.3")).StatusCode);
            await OidcAdmissionTests.Rejected(await Send());
            Assert.Equal(calls, provider.Calls); Assert.Equal(0, registry.Calls);
            Assert.Single(app.Urls); Assert.All(app.Urls, url => Assert.StartsWith("http://unix:", url));
        }
        finally
        {
            await app.StopAsync(); settings.Transport.Cleanup(); Directory.Delete(dir, true);
        }
    }
}
