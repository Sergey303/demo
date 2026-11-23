# ENS-04 — Local ASP.NET Core L7 protection (Codex task)

**Priority P0; status PARTIAL.** Implemented and locally verified: single-process fixed-window HTTP 429/503, real ASP.NET Core integration, **Redis-backed shared quota across two replicas**, fail-closed behavior when Redis is unavailable, reconnection, and namespace isolation. See [README.md](README.md) and [Redis-specific code tasks](src/LocalEdgeApi/TASK.md).

## Implemented
- `src/LocalEdgeApi/Program.cs`: loopback-only Kestrel; `/health`, `/metrics`, `/api/expensive`; controlled 429/503, sanitized counters, no trust in request-supplied X-Forwarded-For.
- `src/LocalEdgeApi/RedisQuota.cs`: atomic Lua fixed-window quota based on Redis server time, shared namespace, timeouts and reconnect cooldowns.
- `tests/test_local_edge_api.py`: real HTTP rate rejection, concurrency exhaustion, recovery, bounded payload, generator roundtrip.
- `tests/test_redis_shared_quota.py`: opt-in disposable Redis 7, two-replica concurrence, namespace isolation, cold/warm outages and recovery.
- Local fixed-window behavior is retained when `LOCAL_EDGE_REDIS_PORT` is unset.

## Next P0/P1
- [ ] [Detailed Redis tasks](src/LocalEdgeApi/TASK.md): dependency readiness, injected latency/timeouts, Redis failover, window boundary and real latency p95.
- [ ] Sliding-window/token bucket comparison with measured impact on legitimate bursts.
- [ ] Trusted reverse proxy, known-proxy allowlist and origin-only ingress; consider authenticated identity partitions only with a validated security boundary.
- [ ] Distributed concurrency control separate from current per-process semaphore.
- [ ] OpenTelemetry/Prometheus counters/traces with no PII and bounded label cardinality.
- [ ] Container/Compose with secure Redis ACL/TLS options; no public defaults or secrets.
- [ ] Provider staging comparison Cloudflare, EdgeCenter and Yandex Cloud. Never confuse app L7 quota with network L3/L4 DDoS protection.

## Acceptance

Only bounded localhost synthetic traffic; no public DDoS or automatic cloud deployment. Default unit tests must run without Docker. Real Redis tests require `RUN_REDIS_TESTS=1`. Every future change should test failure, recovery and concurrency, and distinguish locally tested from provider-verified.
