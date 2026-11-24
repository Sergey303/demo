# EP-12F — per-instance OIDC admission

Implementation base: `90df3430985fdc0415b03c1e8553a13bb9c66fb0`, branch
`feature/ep12f-oidc-admission`, Linux x64 / .NET SDK 10.0.112.
[Implementation scope and plan](../enterprise-auth-bff/EP12F-PLAN.md).
This is a production-path, process-local resource budget, not acceptance of a
production IAM deployment or complete operational rate limiting.

## Contract and trust boundary

[OidcAdmission](../enterprise-auth-bff/src/OidcAdmission.cs) owns exactly two
independent `SlidingWindowRateLimiter` instances, created once per host through
DI and disposed by the host (including their automatic replenishment timers).
No new package, database schema, environment setting or HTTP configuration exists.

| Exact request | Per-host allowance | Window / segments | Queue |
| --- | --- | --- | --- |
| `GET /auth/login` | 60 initiations | 60 seconds / 6 ten-second segments | 0 |
| `GET /signin-oidc` | 180 callbacks | 60 seconds / 6 ten-second segments | 0 |

Production has `AutoReplenishment=true`; `AttemptAcquire(1)` never waits.
These are segmented sliding windows: permits return when their recorded segment
ages out, not exactly 60 seconds after each request. Segment boundaries permit
short bursts. Admitted requests consume a permit even if later OIDC, cookie,
CSRF, provider or session-registration checks fail; leases do not refund permits.
There is no in-flight concurrency cap or timeout change for admitted OIDC work.

[BffApplication.Configure](../enterprise-auth-bff/src/BffApplication.cs) runs
transport validation, HTTPS + exact public origin, PathBase and raw-path checks
first, then admission, then infrastructure file checks and `UseAuthentication`.
Thus a blocked request cannot perform cookie/session SQL validation, discovery,
JWKS fetch, token redemption, session creation or backend forwarding. Program's
startup-only infrastructure/schema probes remain mandatory before serving; the
limiter does not replace those readiness checks. Invalid transport/origin/raw
paths return 400 without spending capacity, even after exhaustion.

Only the two exact GET routes spend permits. Other paths/methods spend neither.
Before authentication, canonical login/callback paths reject non-GET with 405;
case variants of `/signin-oidc` get 400. This closes framework callback matching
and `form_post` bypasses: this BFF intentionally supports only its configured
query-mode GET callback. Provider state/nonce/correlation/token checks remain
unchanged for admitted callbacks. `/auth/complete` remains a public data-free
fixed-link document; it is not authentication or evidence of session creation.

Exhaustion returns **429**, `Cache-Control: no-store`, `X-EP12-BFF: 1`,
`Retry-After: 10`, `Content-Length: 0`, and an empty body. No Set-Cookie,
Location or authentication challenge is emitted. The ten-second value is a
bounded advisory retry cadence aligned with a segment, **not a reservation or
promise** that capacity will be free then; clients may receive another 429.
A blocked callback leaves its protocol cookies untouched. A later retry must
still pass ordinary state, nonce, correlation, expiry and code-redemption checks.
No automatic retry of provider codes is implemented.

## Isolation, false positives and privacy

There is no inferred IP, user or tenant. All browsers, including ones with valid
sessions, share these two host budgets. Cookies, Origin, XFF, query strings,
provider claims and tenant headers cannot select partitions or earn permits.
Direct HTTPS continues to ignore forwarding metadata, including spoofed XFF.
The [UDS transport](EP12D-PROXY.md) rejects XFF and all unapproved proxy headers
before admission; the [Caddy contract](EP12E-CADDY-LIVE.md) must strip them.
No generic forwarded-header middleware, proxy trust list or per-IP fallback is
introduced. Exact host/port checks still apply.

A login flood cannot consume callback permits, but a callback flood can deny
legitimate callbacks, and a login flood can deny legitimate login starts. These
false positives are deliberate: this is **not per-user fairness or DDoS
protection**. Multiple hosts each get their own independent allowance; adding
instances increases fleet capacity, a restart resets counters, and a load
balancer can distribute an attacker across all hosts. Nothing coordinates or
persists budgets. Edge traffic/body/connection controls, provider budgets,
capacity planning, fleet-wide enforcement and incident response remain operator
responsibilities. Admitted work and non-OIDC paths can still overload resources.

This EP-12F slice added no metrics, exporter, remote logging or request labels.
The subsequent [EP-12G slice](EP12G-OBSERVABILITY.md) adds bounded built-in
metrics and a tested numeric external-alert specification, without an exporter. Framework log
suppression remains in Program; edge logs must continue to omit callback queries,
cookies and tokens. At the EP-12F baseline an operator could later count admissions/rejections using
only two fixed route names and two fixed decisions; never tag IP, identity,
query, cookie, token or IdP values. Suggested future alerts: sustained 429 ratio
per fixed route, callback error spikes, and host/provider saturation correlated
with capacity. No deployed alerts or dashboards are implemented; EP-12G supplies only the
external numeric specification and instrumentation described above.

## Executable evidence

[Admission tests](../enterprise-auth-bff/tests/OidcAdmissionTests.cs) exercise the
actual framework OIDC handler with the existing synthetic HTTPS backchannel,
RSA token, PKCE/state/nonce validation and an instrumented in-memory registry.
They cover default limits, exact concurrent caps, independent routes/hosts,
disposal, valid callback redemption after login exhaustion, blocked valid
callback before any provider request, authenticated-cookie SQL bypass on 429,
spoofed metadata, invalid ingress, and method/path exclusions.
[UdsAdmissionTests](../enterprise-auth-bff/tests/UdsTransportTests.cs) uses real
Kestrel AF_UNIX with synthetic proxy headers, sole Unix listener, no database.
Small-budget DI factories are test-only composition after `AddServices`; their
one-hour windows have auto replenishment disabled so exhaustion tests do not
race a timer. Production has no configuration bypass.

These checks establish protocol/admission boundaries, not live provider, SQL,
browser cookie enforcement, production load or long-running timer/soak evidence.
The existing registration-failure and OIDC negative tests remain part of the
full suite. EP-12C/E real HTTPS acceptance remains unchanged and CI-only; it was
not run for this slice. No external DB or models are required or used.

### Local run — 2026-11-16

Worktree `/root/demo-ep12f` only, base SHA above. No shared/external database,
model, Keycloak, Caddy, production Program startup, other worktree, push or merge.
The production source was compiled with warnings as errors. Test execution used
one testhost and disabled test-collection parallelism. Memory limits below are
**per .NET process GC heap** (768 MiB), not an aggregate OS RSS hard limit.

```sh
export DOTNET_EnableDiagnostics=0
export DOTNET_GCHeapHardLimit=0x30000000
export DOTNET_PROCESSOR_COUNT=1
dotnet build enterprise-auth-bff/tests/EnterpriseAuthBff.Tests.csproj -c Release --no-restore -m:1 -p:UseSharedCompilation=false -nodeReuse:false
dotnet vstest enterprise-auth-bff/tests/bin/Release/net10.0/EnterpriseAuthBff.Tests.dll --Settings:enterprise-auth-bff/tests/Serial.runsettings '--TestCaseFilter:FullyQualifiedName~OidcAdmissionTests|FullyQualifiedName~UdsAdmissionTests'
dotnet vstest enterprise-auth-bff/tests/bin/Release/net10.0/EnterpriseAuthBff.Tests.dll --Settings:enterprise-auth-bff/tests/Serial.runsettings
```

The observed focused/full runs used `/tmp/ep12f.runsettings`, with the same XML
settings now committed as [Serial.runsettings](../enterprise-auth-bff/tests/Serial.runsettings).
Build and vstest were separate processes to reduce peak thread/task pressure.
NuGet assets were initially absent; restore succeeded with
`dotnet restore enterprise-auth-bff/tests/EnterpriseAuthBff.Tests.csproj --ignore-failed-sources --disable-parallel`.

| Check actually executed | Result |
| --- | --- |
| Test-first default callback regression before implementation | FAIL as intended: request 181 was 401 instead of 429 |
| Expanded focused tests before canonical-method guard | 7 PASS / 1 FAIL: unsupported callback method reached OIDC (401 instead of 405) |
| Final Release build | PASS, 0 warnings / 0 errors |
| Focused admission + real UDS tests | 10 PASS / 0 FAIL / 0 SKIP, 2 seconds |
| Full BFF Release suite | 135 PASS / 0 FAIL / 8 SKIP, 143 total, 14 seconds |
| `npm ci --offline --no-audit --no-fund` in bootstrap5 | PASS, cached dependencies only |
| `npm run build` (includes application TypeScript check) | PASS |
| `npm run check:e2e` | PASS |
| `node --test --test-concurrency=1 tests/enterprise-auth.test.mjs` | 4 PASS including both real Vite proxy contracts |
| `python3 scripts/check_hiring_review_links.py` | PASS, 7 standard entrypoint documents |
| Same validator's `check()` with EP-12F plan/brief/admission and EP-12/12D docs included | PASS, 12 documents total |
| `git diff --check` | PASS |
| Separate read-only source/security reviewer plus author diff review | No actionable P0/P1/P2 findings; reviewer did not execute tests |

Full-suite skips: seven PostgreSQL cases require opt-in disposable DB configuration;
one foreign-owner fixture requires unavailable CAP_CHOWN. They are **not passes**.
No database tests were opted in. The full suite did execute existing OIDC protocol
negatives, failed-registration/no-session-cookie, session-fake and real socket tests.

Earlier `dotnet test` attempts failed to start CoreCLR (0x8007000E), aborted with
PAL_SEHException or were terminated; the environment was observed at 1,022 of
1,024 allowed tasks. Those attempts are **not test results**, and their root cause
was not fully diagnosed. Only this task's remaining test process was stopped;
unrelated processes were untouched. Separate build/vstest with diagnostics off,
one visible CPU and serial collections then produced the results above.
No Chromium browser suite or EP-12C/E live acceptance was run in this slice;
the task ceiling left insufficient safe browser headroom. Existing TS/Playwright
and live acceptance source/workflow remain unchanged. No long-running timer
replenishment, sustained overload, real-provider or production deployment PASS
is claimed. These are explicit remaining verification boundaries.
