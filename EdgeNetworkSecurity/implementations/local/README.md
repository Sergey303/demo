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
docker run --pull never --rm --name edge-demo-only-redis -p 127.0.0.1:16379:6379 \
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

A Redis connection error, timeout or script failure returns **503 `quota_dependency_unavailable`** for `/api/expensive`. Protected work requires a confirmed Redis admission. Each replica opens its circuit on the first confirmed dependency failure and rejects requests immediately during a 750 ms cooldown. At startup or after cooldown, one caller per replica can trigger a read-only recovery PING. Other callers receive 503 while it runs, including during a healthy cold start. A successful PING closes the circuit. Every protected request still needs its own confirmed Lua result, and a reply from before the latest circuit opening cannot authorize work.

A cold probe waits up to two seconds for connection acquisition and one second for PING. A warm probe reuses the multiplexer, which handles reconnection. The API waits up to one second for each Redis command and cancels the HTTP wait on a client abort. An in-progress recovery probe retains its slot after an HTTP abort until the probe succeeds or reaches its deadline. Redis can still execute a dispatched Lua command and charge a permit after a timeout, disconnect or cancellation. Ambiguous admissions receive no retry or refund.

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

### Opt-in inline AI advisory

Advisory is disabled by default. Set `LOCAL_EDGE_ADVISORY_ENABLED=1` and
configure the absolute paths `LOCAL_EDGE_ADVISORY_PYTHON` and
`LOCAL_EDGE_ADVISORY_ARTIFACTS` at startup. The default enabled mode,
`LOCAL_EDGE_ADVISORY_MODE=oneshot`, uses the existing EIS `inline_advisory.py`
at `LOCAL_EDGE_ADVISORY_SCRIPT`. The API adds an advisory only to successful
`/api/expensive` responses, after quota admission and protected work. Advisory
actions are limited to `allow` and `observe`.

| Setting | Range | Default |
| --- | --- | --- |
| `LOCAL_EDGE_ADVISORY_TIMEOUT_MS` | 100–3000 | 1500 |
| `LOCAL_EDGE_ADVISORY_STARTUP_TIMEOUT_MS` (persistent only) | 100–12000 | 8000 |
| `LOCAL_EDGE_ADVISORY_THRESHOLD_PCT` | 1–100 | 80 |
| `LOCAL_EDGE_ADVISORY_BASELINE_RPS` | 1–100 | 2 |

The API sends exactly four aggregate integers to one local Python worker per
replica. It counts up to 10,000 requests per monotonic fixed window using
`LOCAL_EDGE_WINDOW_SECONDS`. An error response contributes to the window only
if its counted request entered during that same window. The API applies the
configured threshold to the published score. When the worker is occupied or a
score is unavailable, the API uses the sum of baseline-relative load and the
error fraction, capped at one. Observation and fallback both preserve HTTP 200.
`/metrics` exposes per-replica `advisoryScored` (accepted worker scores),
`advisoryFallback` (local fallback scores), and `advisoryObserved` (published
observe actions). The HTTP fixture tests exercise the subprocess contract with
simulated scores and failures.

For the opt-in Linux persistent client, set `LOCAL_EDGE_ADVISORY_MODE=persistent`
and `LOCAL_EDGE_ADVISORY_WORKER_SCRIPT` to a trusted absolute path ending in
`persistent_worker.py`. The interpreter, script, and artifact directory must
exist. The API starts one isolated Python process per replica on demand and
communicates through newline-delimited JSON over standard input and output.
The API limits each handshake or response to 2048 JSON bytes before the
newline and rejects unexpected or duplicate fields. It drains and discards
stderr with bounded memory. The first admitted scoring
request waits for the ready handshake under a separate startup deadline, then
gets the normal score deadline. Warm requests reuse the ready worker. The first
request can pay the full native startup cost, previously about 2.5 seconds for
the isolated one-shot path.

Concurrent scores skip the occupied worker slot and use the local rules. A
timeout or invalid worker exchange kills and reaps the process, uses the local
rules for that request, and allows a fresh start on a later request after a
750 ms cooldown. A client disconnect during an exchange also discards the
worker. Host shutdown cancels any exchange and reaps the worker.
`advisoryWorkerRestarts` counts successful subprocess launches after the
first launch on each replica, including launches that fail the handshake.

The persistent client is locally tested over real HTTP with a synthetic Python
fixture. The latency test prints cold and warm HTTP durations from one worker
PID and inserts a 400 ms synthetic cold delay. Native ONNX/seccomp
integration **is now verified** against the merged real HTTP API: two RDC
cold/warm runs measured **3816.63/4.24 ms** and **2975.05/8.03 ms**.
These are local samples, **not production p95/p99 or an SLA**. The cold call
still blocks for model initialization; a safe asynchronous or pre-warmed
architecture needs separate engineering and acceptance.

## Verification from repo root

```bash
dotnet build EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj --nologo -v:q
python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v

# Explicit opt-in: Docker and a cached redis:7-alpine image required
RUN_REDIS_TESTS=1 python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
```

Inside nested `rdc-project`, Docker publishes ports in a different network namespace. Use `EDGE_REDIS_NETWORK_CONTAINER=rdc-project RUN_REDIS_TESTS=1` for tests there. The ephemeral Redis sidecar shares the RDC namespace, binds **only** to `127.0.0.1`, and is stopped afterward. It never touches existing Redis containers.

For an offline run with the dependencies already cached, point restore to the local package directory. The focused test prints one JSON report containing the status counts and p50/p95 for both replicas.

```bash
local_tests=EdgeNetworkSecurity/implementations/local/tests
local_api=EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj
export RestoreSources="${NUGET_PACKAGES:-$HOME/.nuget/packages}"
export NuGetAudit=false
dotnet build "$local_api" --nologo -v:q
# In rdc-project, also export EDGE_REDIS_NETWORK_CONTAINER=rdc-project
RUN_REDIS_TESTS=1 PYTHONPATH="$local_tests" python3 -B -m unittest -v \
  test_redis_shared_quota.RedisSharedQuotaTests.test_two_replica_outage_report
```

See the [two-replica Redis outage report](REDIS-OUTAGE-REPORT.md) for measured results and the loopback TCP reset test, which drops a real Redis reply after the quota charge.

**Not covered:** L3/L4 anti-DDoS, CDN/WAF/BGP/Anycast, authenticated ingress, trusted reverse proxy, Redis Cluster/ACL/TLS, shared concurrency semaphore, cloud failover, production authentication, or production-level performance. Remaining tasks: [TASK.md](TASK.md) and [code-local Codex TASK](src/LocalEdgeApi/TASK.md).
