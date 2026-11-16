using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace EnterpriseAuthBff;

public static class BffApplication
{
    public const string CookieScheme = "bff-cookie";
    public const string OidcScheme = "bff-oidc";

    public static void AddServices(WebApplicationBuilder builder, BffSettings settings)
    {
        var infrastructure = BffInfrastructure.Load(builder.Configuration);
        infrastructure.Configure(builder.Services);
        AddCoreServices(builder, settings);
    }

    // Explicit dependency injection for isolated test hosts; Program never calls this overload.
    public static void AddServices(WebApplicationBuilder builder, BffSettings settings, ISessionRegistry registry)
    {
        builder.Services.AddSingleton(registry);
        builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();
        AddCoreServices(builder, settings);
    }

    private static void AddCoreServices(WebApplicationBuilder builder, BffSettings settings)
    {
        builder.Services.AddSingleton(settings);
        builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = BffProxy.MaxBody);
        builder.Services.AddHttpClient("upstream", client => client.Timeout = TimeSpan.FromSeconds(120))
            .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler {
                AllowAutoRedirect = false, UseCookies = false, UseProxy = false,
                ConnectTimeout = TimeSpan.FromSeconds(5)
            });
        builder.Services.AddAuthentication(o => {
            o.DefaultAuthenticateScheme = CookieScheme;
            o.DefaultSignInScheme = CookieScheme;
            o.DefaultChallengeScheme = CookieScheme;
        }).AddCookie(CookieScheme, o => {
            o.Cookie.Name = "__Host-Http-EP12";
            o.Cookie.HttpOnly = true; o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            o.Cookie.SameSite = SameSiteMode.Strict; o.Cookie.Path = "/";
            o.ExpireTimeSpan = TimeSpan.FromMinutes(30); o.SlidingExpiration = false;
            o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
            o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
            o.Events.OnSigningIn = async c => {
                var mapped = c.Principal == null ? null : settings.FromCookie(c.Principal);
                if (mapped == null || c.Principal!.Claims.Count() != 4)
                    throw new InvalidOperationException("Invalid session identity.");
                var now = DateTimeOffset.UtcNow;
                c.Properties.IssuedUtc = now; c.Properties.ExpiresUtc = now.AddMinutes(30);
                var sid = SessionId.New();
                await c.HttpContext.RequestServices.GetRequiredService<ISessionRegistry>()
                    .Create(sid, mapped, now, c.Properties.ExpiresUtc.Value, c.HttpContext.RequestAborted);
                // Replace rather than append untrusted provider claims. No external SID accepted.
                c.Principal = mapped.Principal();
                ((System.Security.Claims.ClaimsIdentity)c.Principal.Identity!).AddClaim(new(SessionId.Claim, sid));
            };
            o.Events.OnValidatePrincipal = async c => {
                var mapped = c.Principal == null ? null : settings.FromCookie(c.Principal);
                var sid = c.Principal == null ? null : SessionId.From(c.Principal);
                if (mapped == null || sid == null || c.Principal!.Claims.Count() != 5 ||
                    !await c.HttpContext.RequestServices.GetRequiredService<ISessionRegistry>()
                        .Validate(sid, mapped, c.HttpContext.RequestAborted))
                {
                    c.RejectPrincipal();
                    await c.HttpContext.SignOutAsync(CookieScheme);
                }
            };
        }).AddOpenIdConnect(OidcScheme, o => {
            o.SignInScheme = CookieScheme; o.Authority = settings.Authority;
            o.ClientId = settings.ClientId; o.ClientSecret = settings.ClientSecret;
            o.CallbackPath = "/signin-oidc";
            o.ResponseType = OpenIdConnectResponseType.Code;
            // Query callback avoids requiring the Strict session cookie on a cross-site POST.
            o.ResponseMode = OpenIdConnectResponseMode.Query;
            o.UsePkce = true; o.RequireHttpsMetadata = true;
            o.MapInboundClaims = false; o.SaveTokens = false;
            o.GetClaimsFromUserInfoEndpoint = false;
            o.Scope.Clear(); o.Scope.Add("openid");
            o.RemoteAuthenticationTimeout = TimeSpan.FromMinutes(5);
            o.TokenValidationParameters = new TokenValidationParameters {
                ValidateIssuer = true, ValidIssuer = settings.Authority,
                ValidateAudience = true, ValidAudience = settings.ClientId,
                ValidateLifetime = true, RequireSignedTokens = true, RequireExpirationTime = true,
                ClockSkew = TimeSpan.FromSeconds(30)
            };
            o.Events.OnRedirectToIdentityProvider = c => {
                c.ProtocolMessage.RedirectUri = settings.PublicOrigin + "/signin-oidc";
                return Task.CompletedTask;
            };
            o.Events.OnTokenValidated = c => {
                var subs = c.Principal?.FindAll("sub").ToArray();
                var mapped = subs is { Length: 1 } ? settings.Resolve(c.SecurityToken.Issuer, subs[0].Value) : null;
                if (mapped == null) c.Fail("Identity is not provisioned.");
                else c.Principal = mapped.Principal();
                return Task.CompletedTask;
            };
            o.Events.OnRemoteFailure = c => {
                c.HandleResponse(); c.Response.StatusCode = 401;
                return c.Response.WriteAsJsonAsync(new { error = "OIDC authentication failed." });
            };
            // No remotely initiated signout; this slice supports only CSRF-protected local logout.
            o.RemoteSignOutPath = "/oidc-remote-signout-disabled";
        });
    }

    public static void Configure(WebApplication app, BffSettings settings)
    {
        // Explicitly handle failures even when hosting is started in Development.
        // Do not log exception objects: provider/network errors can include protocol data.
        app.Use(async (context, next) => {
            try { await next(context); }
            catch (Exception)
            {
                if (context.Response.HasStarted) { context.Abort(); return; }
                context.Response.Clear();
                context.Response.StatusCode = 503;
                context.Response.Headers.CacheControl = "no-store";
                context.Response.Headers["X-EP12-BFF"] = "1";
                await context.Response.WriteAsJsonAsync(new { error = "BFF service unavailable." });
            }
        });
        app.Use(async (context, next) => {
            context.Response.Headers.CacheControl = "no-store";
            context.Response.Headers["X-EP12-BFF"] = "1";
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.Headers["Referrer-Policy"] = "no-referrer";
            // No forwarded-header middleware: Host and TLS must match the configured origin.
            if (!context.Request.IsHttps || context.Request.Scheme + "://" + context.Request.Host != settings.PublicOrigin
                || context.Request.PathBase.HasValue)
            { context.Response.StatusCode = 400; return; }
            var raw = context.Features.Get<IHttpRequestFeature>()?.RawTarget;
            // TestHost may omit RawTarget; Kestrel supplies the original request target.
            if (string.IsNullOrEmpty(raw)) raw = context.Request.Path.Value ?? "/";
            var rawPath = raw.Split('?')[0];
            if (!BffProxy.SafePath(rawPath) || rawPath != context.Request.Path.Value)
            { context.Response.StatusCode = 400; return; }
            if (context.Request.Path == "/oidc-remote-signout-disabled" || context.Request.Path == "/signout-callback-oidc")
            { context.Response.StatusCode = 404; return; }
            await next(context);
        });
        app.Use(async (context, next) => {
            context.RequestServices.GetService<BffInfrastructure>()?.CheckFiles();
            await next(context);
        });
        app.UseAuthentication();
        app.Run(async context => {
            var path = context.Request.Path.Value!;
            if (path == "/auth/login")
            {
                if (context.Request.Method != "GET") { context.Response.StatusCode = 405; return; }
                if (context.Request.QueryString.HasValue || !BffProxy.SameSiteMetadata(context.Request))
                { context.Response.StatusCode = 403; return; }
                await context.ChallengeAsync(OidcScheme, new AuthenticationProperties {
                    RedirectUri = "/auth/complete", IsPersistent = false
                });
                return;
            }
            if (path == "/auth/complete")
            {
                if (context.Request.Method != "GET") { context.Response.StatusCode = 405; return; }
                if (context.Request.QueryString.HasValue) { context.Response.StatusCode = 400; return; }
                // A committed same-origin document breaks the cross-site OIDC redirect
                // chain before navigation requiring the Strict session cookie. No data,
                // tokens or caller-controlled return URLs are rendered here.
                context.Response.ContentType = "text/html; charset=utf-8";
                context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
                await context.Response.WriteAsync("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><title>Continue</title><body><a href=\"/dashboard/enterprise-ai\">Continue to workspace</a></body></html>");
                return;
            }
            var mapped = settings.FromCookie(context.User);
            if (mapped == null) { context.Response.StatusCode = 401; return; }
            if (context.Request.Method is not ("GET" or "HEAD") && !BffProxy.SameOrigin(context.Request, settings))
            { context.Response.StatusCode = 403; return; }
            if (path is "/auth/logout" or "/auth/logout-all")
            {
                if (context.Request.Method != "POST") { context.Response.StatusCode = 405; return; }
                if (context.Request.QueryString.HasValue) { context.Response.StatusCode = 400; return; }
                await context.RequestServices.GetRequiredService<ISessionRegistry>()
                    .Revoke(SessionId.From(context.User)!, mapped, path == "/auth/logout-all", context.RequestAborted);
                await context.SignOutAsync(CookieScheme); context.Response.StatusCode = 204; return;
            }
            if (path is "/auth/session" or "/enterprise-search/agent/identity")
            {
                if (context.Request.Method != "GET" || context.Request.QueryString.HasValue)
                { context.Response.StatusCode = 405; return; }
                if (path == "/auth/session") await context.Response.WriteAsJsonAsync(new { tenant = mapped.Tenant, sub = mapped.Subject });
                else await context.Response.WriteAsJsonAsync(new { tenant = mapped.Tenant, subject = mapped.Subject, identity_kind = "oidc" });
                return;
            }
            if (path.StartsWith("/enterprise-api/", StringComparison.Ordinal) || path.StartsWith("/enterprise-search/", StringComparison.Ordinal))
            { await BffProxy.Forward(context, settings, mapped); return; }
            if (path.StartsWith("/auth", StringComparison.Ordinal) || path.StartsWith("/enterprise-", StringComparison.Ordinal))
            { context.Response.StatusCode = 404; return; }
            await BffSpa.Serve(context, app.Environment.ContentRootPath);
        });
    }
}
