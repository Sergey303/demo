# EP-12G — bounded BFF operational metrics

Implementation base: `e6c2aa037c678989a307e2422ea9668add8c58cf`, branch
`feature/ep12g-bff-observability`. This small slice extends
[EP-12F admission](EP12F-ADMISSION.md); it does not establish production observability.

## Runtime contract

[BffMetrics](../enterprise-auth-bff/src/BffMetrics.cs) owns one disposable
`Meter("EnterpriseAuthBff", "1.0.0")` per DI host, never per request.
[BffApplication](../enterprise-auth-bff/src/BffApplication.cs) installs observation
outside transport validation and the existing sanitized exception handler.
Every request traversing this application middleware attempts exactly one counter
measurement and one histogram measurement in finally, including invalid ingress,
401, 403, 429 and caught exceptions. Requests rejected by Kestrel before the
application pipeline are outside this scope. Duration uses Stopwatch.GetTimestamp
and GetElapsedTime, in milliseconds, without wall-clock subtraction.

| Instrument (exact .NET name) | Type / unit | Tags |
| --- | --- | --- |
| request_total | Counter<long> / {request} | route, outcome |
| request_duration_ms | Histogram<double> / ms | route, outcome |
| oidc_failures_total | Counter<long> / {failure} | reason=remote |
| session_registry_failures_total | Counter<long> / {failure} | operation=create, validate, revoke |

Routes are exact case-sensitive `/auth/login` → login, `/signin-oidc` →
oidc_callback, `/auth/session` and `/enterprise-search/agent/identity` → session,
`/auth/logout` and `/auth/logout-all` → logout; remaining ordinal prefixes
`/enterprise-api/` or `/enterprise-search/` → proxy; everything else → other.
Aliases, arbitrary suffixes and unsafe paths cannot create new label values.
No raw path, method, status string, query, IP, user agent, identity, issuer,
exception, token or cookie becomes a tag. Each request instrument has at most
6 × 8 = 48 tag combinations; failure counters have 1 and 3 combinations.
These bounds exclude resource labels an external collector might add.

Outcomes: 200–399 success (including redirects), 401 unauthorized, 403 forbidden,
429 rate_limited, 503 unavailable, 502/504 upstream_failure, remaining 500–599
error, everything else other. These are response classifications, not diagnoses.
Aborted responses retain their last application status; metrics do not prove
client receipt. Other includes malformed requests and unsupported methods.

Only OnRemoteFailure increments the OIDC counter; it includes protocol rejection
and unprovisioned identities, without attempting to distinguish their causes.
A callback 401 or early 429 alone does not increment it. Discovery failures at
login can produce 503 without invoking OnRemoteFailure. Registry wrappers around
OnSigningIn/Create, OnValidatePrincipal/Validate and logout/Revoke count thrown
failures before rethrowing. A false validation result is normal rejection, not
registry failure. OperationCanceledException is excluded only when RequestAborted
is canceled; independent timeouts count. Cookie issuance, revocation and error
handling remain unchanged. Measurement listener exceptions are swallowed per
instrument, preserving auth/HTTP behavior and attempting the second measurement.
A faulty listener may lose telemetry; exactly-once delivery is not guaranteed.

No endpoint, exporter, package, environment setting or new log is added.
The meter is instrumented but **not automatically scraped**. An operator must
explicitly configure an external listener/collector/exporter, privacy-safe resource
attributes, histogram aggregation and retention. Framework logging suppression
remains unchanged. This is not deployment or alert delivery evidence.

## External dashboard and alert specification (not deployed)

Use per-route request rate, outcome ratio, duration mean and p95; show missing
telemetry distinctly from zero. Mean duration is duration sum divided by sample
count in the same window. A p95 needs collector histogram buckets, with explicit
millisecond boundaries (for example 10, 50, 100, 250, 500, 1000, 5000); it cannot
be recovered from a counter alone. Exporter name/unit translation is not fixed
here, so no executable Prometheus YAML or validated PromQL is claimed.

An external evaluator can implement these exact numeric rules. Evaluate every
30 seconds using a rolling five-minute window of reset-aware counter increases,
aggregated across instances by fixed route before dividing. A reset-aware
increase must handle process restart; missing samples are unknown, not zero.

- Admission pressure, separately for login and oidc_callback: at least 100
  requests in the window AND rate_limited / all requests > 0.20 continuously
  for two minutes. This means more than 20% rejection at meaningful traffic,
  not an absolute per-second limit or per-user attack attribution.
- Registry failure: at least 3 thrown failures across create/validate/revoke
  in five minutes, continuously for one minute. This is an absolute event
  threshold, not a failure ratio: no successful-operation instrument exists.
- OIDC remote rejection: at least 100 callback requests AND remote failures /
  callback requests > 0.10 continuously for two minutes. Rate-limited callbacks
  remain in the denominator; this is a callback rejection fraction, not a
  provider availability SLO. Correlate with admission pressure.

Window increments may be fractional under Prometheus extrapolation; comparisons
are strict for ratios and inclusive for traffic/failure minimums. For durations,
start with a dashboard rather than inventing an unmeasured latency SLO.
[Executable threshold examples](../scripts/check_ep12g_alert_spec.py) check
boundary values, low traffic, missing data and continuous hold semantics. They
validate this mathematical specification, not a Prometheus parser, collector,
notification channel, real incident or delivery path.

## Verification and limitations

[MeterListener tests](../enterprise-auth-bff/tests/MetricsTests.cs) filter by exact
Meter reference, exercise the actual runtime instruments, and assert complete tag
dictionaries. Synthetic OIDC backchannel runs the real framework handler including
signature and unknown-identity negatives. Registry tests use an in-memory failing
registry, not live PostgreSQL. Tests cover canonical labels, isolation, monotonic
nonnegative duration, faulty listeners, cancellation, invalid ingress, 429, 401,
403, 502 and 503 create/validate/revoke paths. Existing EP-12F and socket tests
remain in the serial full suite. No shared database, model or production TLS used.

No live EP-12C/E rerun, exporter integration, delivered alert, production capacity,
long-duration soak, latency SLO or real PostgreSQL outage is proven by this slice.
Tests were authored after implementation; no test-first red/green claim is made.

### Local evidence, 2026-11-16

Release build used `DOTNET_EnableDiagnostics=0 DOTNET_PROCESSOR_COUNT=1
DOTNET_GCHeapHardLimit=0x30000000 dotnet build
enterprise-auth-bff/tests/EnterpriseAuthBff.Tests.csproj -c Release --no-restore
-m:1 -p:UseSharedCompilation=false -nodeReuse:false`: zero warnings/errors.
Runtime runs use `dotnet vstest
enterprise-auth-bff/tests/bin/Release/net10.0/EnterpriseAuthBff.Tests.dll
--Settings:enterprise-auth-bff/tests/Serial.runsettings`; build and tests are
separate, serial processes. The GC bound is per-process, not aggregate RSS.
The initial metrics-only run passed **14/14 cases** (zero skips).
After RDC recovered, final Release build completed with **zero warnings/errors**
and a serial bounded-memory VSTest run completed with **149 PASS, 8 SKIP,
0 FAIL out of 157** in 18 seconds. The eight skips were seven opt-in
PostgreSQL integration scenarios without a disposable database and one
privileged Linux ownership case; they are not counted as successes.
The separate Python alert checker passed **3/3** examples. This verifies
instrumentation/threshold contracts, not deployed alerts, exporter or
production database outages.

Independent read-only code review found no actionable defects; it did not run
.NET or databases. The numeric alert checker passed 3 tests. Standard review
links passed (7 documents), and adding the two new EP12G documents passed
(9 documents). An additional EP12F document scan found the already missing
`EP12F-IMPLEMENTATION-BRIEF.md` link; this historical baseline issue is not
presented as a successful extended check.

The first full serial attempt stalled without a result while the RDC cgroup
was near its 1,024-process/thread ceiling, and the Remote Desktop connection
temporarily dropped. Its partial log is **not** used as evidence. Following
RDC recovery, an independently invoked full serial BFF Release suite ran to
completion as recorded above. The stall's exact cause was not conclusively
established; no unrelated processes or shared databases were changed.
EP-12C/E real-provider and Caddy regression are separate **CI gates** for
this feature and remain pending until the published branch passes them.
