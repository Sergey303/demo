# ENS-04-R — Codex CLI: Redis follow-up tasks (in the code folder)

Read [../../TASK.md](../../TASK.md), [../../README.md](../../README.md), and [EdgeNetworkSecurity/AGENTS.md](../../../../AGENTS.md). Scope: `RedisQuota.cs`, `Program.cs` and nearby tests. Never change other apps or commit secrets.

## Implemented and locally verified

- [x] StackExchange.Redis pinned to 2.8.16; Redis `TIME` + atomic Lua fixed-window quota, one static namespace key.
- [x] Two real ASP.NET Core instances share an exact quota under concurrent requests.
- [x] Exhausted quota returns 429 with calculated `Retry-After`.
- [x] Missing/failed Redis yields 503 rather than independent per-process quotas.
- [x] Cold/warm outage tests, reconnection, isolated namespaces, bounded settings and retry cooldown.
- [x] Existing no-Redis ASP.NET Core limiter remains functional; metrics have no PII.

## Next P0 tasks for Codex

- [x] Add dependency readiness via Redis PING, separate from `/health`. Verify cold/warm loss, recovery and timeout without creating or refreshing quota state.
- [x] Bound Redis command waits and respect HTTP request cancellation. Test paused Redis and client abort after dispatch. Verify fail-closed 503 for confirmed dependency failures and zero protected work for timed-out or aborted requests.
- [x] Embed the versioned `quota-v1.lua` artifact. Verify atomic admission at rollover while the old key still exists, idle expiry, and fail-closed behavior for malformed or future-bucket state.
- [x] Inject a TCP reset on the Redis connection after quota dispatch and before the reply reaches the API. The loopback relay test verified a sanitized 503, zero protected work and a retained charge after recovery under the same namespace.
- [ ] Exercise primary failover and actual clock skew with retained or lost quota state. Verify the behavior and document how much quota can be lost or reopened.
- [x] Add a bounded circuit breaker and one read-only recovery probe per replica. Verify cold and warm 503, zero outage work, and a client abort during recovery.
- [x] Record latency p50/p95, 429/503 counts, readiness recovery and CLI parameters in the [single-run two-replica report](../../REDIS-OUTAGE-REPORT.md).

## P1 architecture and security

- [ ] Evaluate sliding-window/token-bucket alternatives, compare legitimate burst overblocking and Redis cost.
- [ ] Trusted reverse proxy and origin-only ingress; never trust caller-supplied IP headers or credentials.
- [ ] True distributed concurrency limiter with expiring leases and fencing, separately from this shared rate quota.
- [ ] Optional secret-managed Redis TLS/ACL and environment isolation; no arbitrary public Redis endpoint.
- [ ] OpenTelemetry/Prometheus instrumentation, low-cardinality labels and distributed tracing.
- [ ] Build a container/Compose topology only with explicit security defaults, safe lifecycle controls and documented rollback.

## Acceptance

Use synthetic, bounded localhost traffic only. Ordinary tests must not require Docker. Real Redis tests require `RUN_REDIS_TESTS=1` and a disposable isolated container from a locally cached image. Keep clear evidence/status labels: tested locally ≠ provider-verified. No cloud `apply`.

## P0 advisory integration (verified in the fourth parallel development wave)

- [x] Optional localhost ASP.NET Core `/api/expensive` invokes a bounded Python advisory process after quota admission and protected work; returns only `allow/observe`, with deterministic EdgeAI rule fallback on malformed output, missing model, timeout or process failure. 429/503 do not trigger inference.
- [x] Real HTTP tests cover nonblocking concurrency slot release, worker kill/reap, cancellation, invalid outputs, source validation, per-replica aggregate-only input, and matching the EdgeAI fallback score.
- [x] Implement and verify the opt-in persistent ASP.NET Core client with real loopback HTTP and a synthetic Python fixture. Verify PID reuse, separate startup/scoring deadlines, quota bypass prevention, strict protocol validation, cooldown, cancellation, and process reap.
- [x] Run merged real ASP.NET Core → persistent seccomp Python → ONNX CPU E2E: two HTTP 200 scores use the same process/session, third request stays 429; measured 3817/4.24 ms and 2975/8.03 ms cold/warm on RDC. This is local evidence, not production latency/SLA.
- [ ] Measure real request latency and failure probability under sustained safe localhost load, including CPU/RAM budgets, cold/warm startup, and multi-replica fairness. No production readiness claim.

## P0 background prewarm

Base SHA `dc24f8557192b93be54890cad6fba81624c5ae20`.

- [x] Verify opt-in background startup over real loopback ASP.NET Core HTTP with a synthetic Python fixture. Cover handshake readiness before the first protected request, PID reuse, early rule-only HTTP 200, quota and concurrency rejections, Redis outage, and prewarm disabled by default.
- [x] Verify bad startup configuration, missing artifacts, malformed or missing handshake, timeout, worker exit, cooldown and on-demand recovery, and process reap during shutdown.
- [x] Run cross-project acceptance of background prewarm with native seccomp/ONNX: real localhost tests verified readiness before any protected request, 2 admitted CPU scores on the warmed session, HTTP 429 without scoring, and safe shutdown/reap through the separate API regression. Initial local HTTP samples 82.89/4.10 ms; see [prewarm evidence](../../../../../EdgeIntegratedScenarios/EVIDENCE-2026-11-23-PREWARM.md).

The .NET build completed with zero warnings and errors. The local Python suite passed 32 tests and skipped 11 opt-in Docker Redis tests.
