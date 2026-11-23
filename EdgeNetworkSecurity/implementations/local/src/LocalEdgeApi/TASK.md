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
- [ ] Inject a Redis-side TCP disconnect after dispatch and before reply. Verify a sanitized 503, zero protected work and recovery under the same namespace.
- [ ] Exercise primary failover and actual clock skew with retained or lost quota state. Verify the behavior and document how much quota can be lost or reopened.
- [ ] Add a bounded circuit breaker/recovery probe policy and measure 503 latency under Redis outages.
- [ ] Generate a reproducible 2-instance report: Redis request latency p50/p95, 429/503 counts, session recovery and CLI run parameters.

## P1 architecture and security

- [ ] Evaluate sliding-window/token-bucket alternatives, compare legitimate burst overblocking and Redis cost.
- [ ] Trusted reverse proxy and origin-only ingress; never trust caller-supplied IP headers or credentials.
- [ ] True distributed concurrency limiter with expiring leases and fencing, separately from this shared rate quota.
- [ ] Optional secret-managed Redis TLS/ACL and environment isolation; no arbitrary public Redis endpoint.
- [ ] OpenTelemetry/Prometheus instrumentation, low-cardinality labels and distributed tracing.
- [ ] Build a container/Compose topology only with explicit security defaults, safe lifecycle controls and documented rollback.

## Acceptance

Use synthetic, bounded localhost traffic only. Ordinary tests must not require Docker. Real Redis tests require `RUN_REDIS_TESTS=1` and a disposable isolated container from a locally cached image. Keep clear evidence/status labels: tested locally ≠ provider-verified. No cloud `apply`.
