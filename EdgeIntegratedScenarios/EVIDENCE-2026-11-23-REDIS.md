# Redis shared quota — locally verified ENS-04 extension

**Date:** 2026-11-23. **Repository:** Sergey303/demo. **Tested base:** `37171ea` in an isolated RDC worktree with local modifications. Result status: **local-tested**, not provider-verified.

## Architecture

`/api/expensive` → endpoint filter (Redis mode) → StackExchange.Redis `ScriptEvaluateAsync` → atomic one-key Lua fixed-window quota using Redis server `TIME` → allow (200) or rate reject (429). Redis connection errors, timeouts or loss return **503**, not independent local fallback. A separate local semaphore returns 503 for per-process concurrency saturation. With Redis disabled, the original single-process ASP.NET Core fixed-window limiter remains active.

Configuration: `LOCAL_EDGE_REDIS_PORT` (loopback only, 1024..65535), `LOCAL_EDGE_REDIS_NAMESPACE` (static ASCII, 1..32 chars), `LOCAL_EDGE_PERMITS` and `LOCAL_EDGE_WINDOW_SECONDS`. Replicas must use the same namespace and matching quotas. Client-supplied addresses/headers are never used in the key.

## Reproduction

```bash
dotnet build EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj --nologo -v:q
python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v

# On a regular Linux CI host with Docker, real Redis tests are explicit:
RUN_REDIS_TESTS=1 python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v

# On nested RDC with Docker Desktop network namespace separation:
EDGE_REDIS_NETWORK_CONTAINER=rdc-project RUN_REDIS_TESTS=1 \
  python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
```

The tests create **their own disposable Redis 7 container** under a randomized name, persistence disabled, memory/CPU bounds, localhost-only TCP, and `--rm`. On RDC the sidecar shares the `rdc-project` network namespace but Redis binds strictly to `127.0.0.1`. It never uses the existing ChatPilot or KnowledgePilot Redis instances.

## Observed results on RDC

- .NET 10 build passed with **0 warnings, 0 errors**.
- **8 local API/Redis tests passed** after adding namespace-isolation and cold-start fault tests (4 legacy real HTTP API + 4 genuine Redis).
- Concurrent requests across **two independent real ASP.NET Core processes** on one namespace produced **4 × 200 and 8 × 429**. Both processes contributed to one atomic quota; rejection included positive `Retry-After`.
- Different namespaces remained independent.
- Redis absent at startup: `/health` stayed 200, `/api/expensive` returned 503; after starting Redis the same API process recovered.
- Redis stopped during operation: the API returned 503 and incremented `redisUnavailable`; after Redis restarted the same API process recovered.
- Existing non-Redis tests previously passed: 37 simulator/policy + 6 bounded loopback probe tests.

**Important:** these are local observations of the tested implementation. A later test-only improvement to align the concurrent fixture with a Redis window boundary was committed directly through GitHub after the RDC control connection stopped responding; that exact revision still requires CI confirmation. Do not claim that GitHub Actions has passed until checked.

## Explicit non-claims

1. This demonstrates **application L7 rate limiting**, not volumetric L3/L4 protection, Anycast or ISP routing.
2. The disposable Redis is loopback-only **without ACL/TLS**; no production deployment is justified.
3. No Redis Cluster/primary failover, cross-region clocks, script migration, disaster recovery or distributed semaphore has been validated.
4. Metrics remain per-process. `scope=redis_shared` identifies the quota backend, not global metrics aggregation.
5. No live load generator, external DDoS target, cloud account, user-sensitive data or provider cost was involved.

Further work is tracked beside the implementation: [Redis-focused TASK.md](../EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/TASK.md).
