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

The embedded [quota-v1.lua](src/LocalEdgeApi/quota-v1.lua) script uses Redis `TIME` and an atomic evaluation of one key. A 429 includes `Retry-After`, rounded up from the remaining window time. Rejections leave the counter and TTL unchanged. A successful admission stores the current bucket and count with a TTL of two windows. The next window starts a fresh count even while the previous bucket's key exists.

A Redis connection error, timeout or script failure returns **503 `quota_dependency_unavailable`** for `/api/expensive`. Protected work requires a confirmed Redis admission. Initial connection failures have a short retry cooldown. After a warm outage the shared multiplexer reconnects, and disconnected commands fail fast. Once connected, the API waits at most one second per command, and a client abort cancels the API's wait. Redis can still execute a dispatched command and charge the quota after a timeout or cancellation. The API neither refunds nor retries an ambiguous admission.

A retained bucket ahead of Redis time causes a 503 until the clock catches up, the state expires, or the state is repaired. Malformed retained state also produces a 503. If failover loses quota state, the new primary can admit a fresh quota. Primary failover and live clock changes remain open for testing. The lab supports loopback Redis without TLS or authentication.

### Endpoints, concurrency and counters

| Endpoint | Meaning |
| --- | --- |
| `GET /health` | Liveness 200 even during Redis outage |
| `GET /ready` | 200 in local mode or when Redis responds to the probe. 503 on Redis failure or timeout. Responses use `Cache-Control: no-store`. |
| `GET /api/expensive` | 200 allowed; 429 quota exhausted; 503 when Redis unavailable or concurrency exhausted |
| `GET /api/expensive?holdMs=450` | Bounded synthetic work (0..500ms) |
| `GET /metrics` | Per-process counters; `scope` names quota mode, **not globally aggregated metrics** |

Readiness checks Redis with a non-mutating PING. It does not consume permits or check quota state, script execution permissions, or write availability.

`LOCAL_EDGE_PERMITS` 1..100, `LOCAL_EDGE_WINDOW_SECONDS` 1..60, `LOCAL_EDGE_CONCURRENCY` 1..32, `LOCAL_EDGE_PORT` 1024..65535. A per-process semaphore independently permits at most two simultaneous expensive requests by default, returning 503 `concurrency_exhausted` when saturated. **This is not distributed concurrency control.** Invalid inputs return 400 when they pass the rate filter. Metrics have no client identifiers, tokens or dynamic labels.

## Verification from repo root

```bash
dotnet build EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj --nologo -v:q
python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v

# Explicit opt-in: Docker and a cached redis:7-alpine image required
RUN_REDIS_TESTS=1 python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
```

Inside nested `rdc-project`, Docker publishes ports in a different network namespace. Use `EDGE_REDIS_NETWORK_CONTAINER=rdc-project RUN_REDIS_TESTS=1` for tests there. The ephemeral Redis sidecar shares the RDC namespace, binds **only** to `127.0.0.1`, and is stopped afterward. It never touches existing Redis containers.

Loopback verification passed 14 tests with .NET 10 and a disposable Redis 7 container. Tests cover single-process limits, shared quotas and namespace isolation, readiness without quota use, cold/warm outage and recovery, atomic rollover, idle expiry, malformed and future-bucket state, Redis command timeout, and HTTP client abort after dispatch.

**Not covered:** L3/L4 anti-DDoS, CDN/WAF/BGP/Anycast, authenticated ingress, trusted reverse proxy, Redis Cluster/ACL/TLS, shared concurrency semaphore, cloud failover, production authentication, or production-level performance. Remaining tasks: [TASK.md](TASK.md) and [code-local Codex TASK](src/LocalEdgeApi/TASK.md).
