using System.Diagnostics.Metrics;
using EnterpriseAuthBff;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EnterpriseAuthBff.Tests;

public class MetricsTests
{
    private sealed class Capture : IDisposable
    {
        private readonly MeterListener listener = new();
        internal readonly List<(string Name, double Value, Dictionary<string, object?> Tags)> Values = new();
        internal Capture(BffMetrics metrics, bool throws = false)
        {
            listener.InstrumentPublished = (instrument, l) => {
                if (ReferenceEquals(instrument.Meter, metrics.Meter)) l.EnableMeasurementEvents(instrument);
            };
            void Add(Instrument i, double value, ReadOnlySpan<KeyValuePair<string, object?>> tags)
            {
                lock (Values) Values.Add((i.Name, value, tags.ToArray().ToDictionary(x => x.Key, x => x.Value)));
                if (throws) throw new IOException("private-listener-marker");
            }
            listener.SetMeasurementEventCallback<long>((i, v, t, _) => Add(i, v, t));
            listener.SetMeasurementEventCallback<double>((i, v, t, _) => Add(i, v, t));
            listener.Start();
        }
        internal void Pair(string route, string outcome)
        {
            var count = Assert.Single(Values, x => x.Name == "request_total");
            var duration = Assert.Single(Values, x => x.Name == "request_duration_ms");
            Assert.Equal(1, count.Value); Assert.True(double.IsFinite(duration.Value) && duration.Value >= 0);
            foreach (var item in new[] { count, duration })
            {
                Assert.Equal(2, item.Tags.Count);
                Assert.Equal(route, item.Tags["route"]); Assert.Equal(outcome, item.Tags["outcome"]);
            }
        }
        public void Dispose() => listener.Dispose();
    }

    [Theory]
    [InlineData("/auth/session", 401, "session", "unauthorized")]
    [InlineData("/auth/login?private-user=secret", 403, "login", "forbidden")]
    [InlineData("/SIGNIN-OIDC?code=private", 400, "other", "other")]
    [InlineData("/private-unique-user", 401, "other", "unauthorized")]
    [InlineData("/auth/complete", 200, "other", "success")]
    public async Task Actual_http_records_one_bounded_pair(string path, int status, string route, string outcome)
    {
        await using var host = await Harness.Start();
        using var capture = new Capture(host.App.Services.GetRequiredService<BffMetrics>());
        using var response = await host.Client.GetAsync(path);
        Assert.Equal(status, (int)response.StatusCode); capture.Pair(route, outcome);
        Assert.DoesNotContain(capture.Values, x => x.Name == "oidc_failures_total");
    }

    [Fact]
    public async Task Rate_limit_is_counted_once_without_sensitive_headers()
    {
        await using var host = await Harness.Start(b => OidcAdmissionTests.SmallBudget(b, callback: 1));
        using var first = await host.Client.GetAsync("/signin-oidc?state=private");
        using var capture = new Capture(host.App.Services.GetRequiredService<BffMetrics>());
        using var request = new HttpRequestMessage(HttpMethod.Get, "/signin-oidc?code=unique-secret");
        request.Headers.Add("X-Forwarded-For", "203.0.113.77"); request.Headers.Add("Cookie", "private=unique");
        using var response = await host.Client.SendAsync(request);
        Assert.Equal(429, (int)response.StatusCode); capture.Pair("oidc_callback", "rate_limited");
        Assert.Equal(2, capture.Values.Count);
    }

    [Theory]
    [InlineData("create")]
    [InlineData("validate")]
    [InlineData("revoke")]
    public async Task Registry_failures_keep_503_and_static_operation(string operation)
    {
        using var provider = new FakeProvider();
        var registry = new MemorySessionRegistry();
        await using var host = await Harness.Start(b => b.Services.Configure<OpenIdConnectOptions>(BffApplication.OidcScheme,
            o => o.Backchannel = new HttpClient(provider)), registry: registry);
        HttpRequestMessage request;
        if (operation == "create")
        {
            using var login = await host.Client.GetAsync("/auth/login");
            var query = QueryHelpers.ParseQuery(login.Headers.Location!.Query);
            provider.Nonce = query["nonce"].ToString(); provider.Challenge = query["code_challenge"].ToString();
            request = OidcFlowTests.Callback(login, query["state"].ToString()); registry.FailCreate = true;
        }
        else
        {
            request = new HttpRequestMessage(operation == "revoke" ? HttpMethod.Post : HttpMethod.Get,
                operation == "revoke" ? "/auth/logout" : "/auth/session");
            request.Headers.Add("Cookie", host.Cookie()); request.Headers.Add("Origin", "https://bff.example.test");
            registry.Unavailable = operation == "validate"; registry.FailRevoke = operation == "revoke";
        }
        using (request)
        using (var capture = new Capture(host.App.Services.GetRequiredService<BffMetrics>()))
        using (var response = await host.Client.SendAsync(request))
        {
            Assert.Equal(503, (int)response.StatusCode);
            capture.Pair(operation == "create" ? "oidc_callback" : operation == "revoke" ? "logout" : "session", "unavailable");
            var failure = Assert.Single(capture.Values, x => x.Name == "session_registry_failures_total");
            Assert.Equal("operation", Assert.Single(failure.Tags).Key); Assert.Equal(operation, failure.Tags["operation"]);
            Assert.Equal(3, capture.Values.Count);
        }
    }

    [Theory]
    [InlineData("unknown-sub")]
    [InlineData("signature")]
    public async Task Real_oidc_negative_records_only_remote_reason(string failure)
    {
        using var provider = new FakeProvider { Failure = failure };
        await using var host = await Harness.Start(b => b.Services.Configure<OpenIdConnectOptions>(BffApplication.OidcScheme,
            o => o.Backchannel = new HttpClient(provider)));
        using var login = await host.Client.GetAsync("/auth/login");
        var query = QueryHelpers.ParseQuery(login.Headers.Location!.Query);
        provider.Nonce = query["nonce"].ToString(); provider.Challenge = query["code_challenge"].ToString();
        using var capture = new Capture(host.App.Services.GetRequiredService<BffMetrics>());
        using var callback = OidcFlowTests.Callback(login, query["state"].ToString());
        using var response = await host.Client.SendAsync(callback);
        Assert.Equal(401, (int)response.StatusCode); capture.Pair("oidc_callback", "unauthorized");
        var remote = Assert.Single(capture.Values, x => x.Name == "oidc_failures_total");
        Assert.Equal("reason", Assert.Single(remote.Tags).Key); Assert.Equal("remote", remote.Tags["reason"]);
        Assert.Equal(3, capture.Values.Count);
    }

    [Fact]
    public async Task Invalid_ingress_and_upstream_failure_keep_existing_responses()
    {
        await using var host = await Harness.Start();
        using (var capture = new Capture(host.App.Services.GetRequiredService<BffMetrics>()))
        using (var request = new HttpRequestMessage(HttpMethod.Get, "/auth/session?private=secret"))
        {
            request.Headers.Host = "evil.test";
            using var response = await host.Client.SendAsync(request);
            Assert.Equal(400, (int)response.StatusCode); capture.Pair("session", "other");
        }
        host.Outbound.Redirect = true;
        using (var capture = new Capture(host.App.Services.GetRequiredService<BffMetrics>()))
        using (var request = new HttpRequestMessage(HttpMethod.Get, "/enterprise-api/ready"))
        {
            request.Headers.Add("Cookie", host.Cookie());
            using var response = await host.Client.SendAsync(request);
            Assert.Equal(502, (int)response.StatusCode); capture.Pair("proxy", "upstream_failure");
        }
    }

    [Fact]
    public void Canonical_routes_and_outcomes_are_closed_vocabularies()
    {
        Assert.Equal("login", BffMetrics.Route("/auth/login"));
        Assert.Equal("oidc_callback", BffMetrics.Route("/signin-oidc"));
        Assert.Equal("session", BffMetrics.Route("/enterprise-search/agent/identity"));
        Assert.Equal("logout", BffMetrics.Route("/auth/logout-all"));
        Assert.Equal("other", BffMetrics.Route(null));
        Assert.Equal("other", BffMetrics.Route("/auth/login/attacker"));
        Assert.Equal("other", BffMetrics.Route("/enterprise-apiX/attacker"));
        for (var i = 0; i < 100; i++)
        {
            Assert.Equal("other", BffMetrics.Route("/attacker/" + i));
            Assert.Equal("proxy", BffMetrics.Route("/enterprise-search/attacker/" + i));
        }
        var outcomes = new HashSet<string> { "success", "unauthorized", "forbidden", "rate_limited",
            "unavailable", "upstream_failure", "error", "other" };
        for (var status = 100; status < 700; status++) Assert.Contains(BffMetrics.Outcome(status), outcomes);
        Assert.Equal("error", BffMetrics.Outcome(500));
    }

    [Fact]
    public async Task Cancellation_and_instances_and_faulty_listener_are_isolated()
    {
        using var first = new BffMetrics(); using var second = new BffMetrics();
        using var capture = new Capture(first, throws: true);
        await second.Observe(new DefaultHttpContext(), _ => Task.CompletedTask); Assert.Empty(capture.Values);
        using var aborted = new CancellationTokenSource(); aborted.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => first.Registry(BffMetrics.Operation.Validate,
            aborted.Token, () => Task.FromCanceled(aborted.Token)));
        Assert.Empty(capture.Values);
        await first.Observe(new DefaultHttpContext(), _ => Task.CompletedTask);
        capture.Pair("other", "success");
        await Assert.ThrowsAsync<OperationCanceledException>(() => first.Registry(BffMetrics.Operation.Validate,
            CancellationToken.None, () => throw new OperationCanceledException("private")));
        Assert.Equal(3, capture.Values.Count);
    }
}
