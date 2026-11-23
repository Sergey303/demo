# ENS-04 — local ASP.NET Core L7 rate limiting

**Status: implemented and locally tested.** Two modes: (1) original single-process fixed-window limiter, (2) optional **Redis 7 shared fixed-window quota across API replicas**. This is L7 application rate limiting, **not** provider anti-DDoS L3/L4 protection.

Code: [Program.cs](src/LocalEdgeApi/Program.cs), [RedisQuota.cs](src/LocalEdgeApi/RedisQuota.cs), [Codex tasks next to the code](src/LocalEdgeApi/TASK.md).

## One instance without Redis

```bash
dotnet run --project EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj
# In another terminal:
python3 EdgeNetworkSecurity/shared/traffic-generator/probe.py \
  --scenario EdgeNetworkSecurity/shared/traffic-generator/example-429.json \
  --url http://127.0.0.1:5088/api/expensive
```

Default: 4 requests / 2 seconds, no queue. The ASP.NET Core fixed-window limiter returns HTTP 429. Kestrel binds explicitly to `127.0.0.1` regardless of `ASPNETCORE_URLS`.

## Shared quota across two replicas (optional)

On a regular Docker host start a **disposable, loopback-only Redis**:

```bash
docker run --rm --name edge-demo-only-redis -p 127.0.0.1:16379:6379 \
  redis:7-alpine redis-server --save '' --appendonly no
```

In two other terminals, run with the **same Redis namespace and identical quotas**, but different ports:

```bash
LOCAL_EDGE_PORT=5088 LOCAL_EDGE_REDIS_PORT=16379 LOCAL_EDGE_REDIS_NAMESPACE=edge-demo \
  dotnet run --project EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj

LOCAL_EDGE_PORT=5089 LOCAL_EDGE_REDIS_PORT=16379 LOCAL_EDGE_REDIS_NAMESPACE=edge-demo \
  dotnet run --project EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj
```

Calls to either `http://127.0.0.1:5088/api/expensive` or port 5089 consume **one atomic quota**. Distinct namespaces have independent quotas. `LOCAL_EDGE_REDIS_PORT` enables Redis mode; only loopback ports (1024..65535) are accepted, never a remote hostname. `LOCAL_EDGE_REDIS_NAMESPACE` accepts 1..32 ASCII letters, digits, `_`, `-`. This is one service-wide quota: users, client IPs and forwarded headers never enter the Redis key.

Lua uses Redis `TIME`, one key and atomic `EVAL` to avoid race conditions and API-server clock skew. A 429 includes a Redis-based `Retry-After`. A Redis connection error, timeout or unavailable service produces **503 `quota_dependency_unavailable`** (fail-closed for `/api/expensive`), **never** a silent fallback to independent local quotas. Recovery automatically retries after a bounded cooldown. Only loopback Redis **without TLS or authentication** is supported in this lab; do not deploy it to a public network.

### Endpoints, concurrency and counters

| Endpoint | Meaning |
| --- | --- |
| `GET /health` | Liveness 200 even during Redis outage; **not dependency readiness** |
| `GET /api/expensive` | 200 allowed; 429 quota exhausted; 503 when Redis unavailable or concurrency exhausted |
| `GET /api/expensive?holdMs=450` | Bounded synthetic work (0..500ms) |
| `GET /metrics` | Per-process counters; `scope` names quota mode, **not globally aggregated metrics** |

`LOCAL_EDGE_PERMITS` 1..100, `LOCAL_EDGE_WINDOW_SECONDS` 1..60, `LOCAL_EDGE_CONCURRENCY` 1..32, `LOCAL_EDGE_PORT` 1024..65535. A per-process semaphore independently permits at most two simultaneous expensive requests by default, returning 503 `concurrency_exhausted` when saturated. **This is not distributed concurrency control.** Invalid inputs return 400 when they pass the rate filter. Metrics have no client identifiers, tokens or dynamic labels.

## Verification from repo root

```bash
dotnet build EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj --nologo -v:q
python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v

# Explicit opt-in: actual temporary Redis 7 container, Docker required
RUN_REDIS_TESTS=1 python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
```

Inside nested `rdc-project`, Docker publishes ports in a different network namespace. Use `EDGE_REDIS_NETWORK_CONTAINER=rdc-project RUN_REDIS_TESTS=1` for tests there. The ephemeral Redis sidecar shares the RDC namespace, binds **only** to `127.0.0.1`, and is stopped afterward. It never touches existing Redis containers.

Tests cover true 429 and recovery, local concurrency 503, spoofed `X-Forwarded-For`, two-replica atomic totals, namespace isolation, Redis outage at startup/during operation, liveness during failure and automatic reconnection. The original single-process mode remains tested.

**Not covered:** L3/L4 anti-DDoS, CDN/WAF/BGP/Anycast, authenticated ingress, trusted reverse proxy, Redis Cluster/ACL/TLS, shared concurrency semaphore, cloud failover, production authentication, or production-level performance. Remaining tasks: [TASK.md](TASK.md) and [code-local Codex TASK](src/LocalEdgeApi/TASK.md).
