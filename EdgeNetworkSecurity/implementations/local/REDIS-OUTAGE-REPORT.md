# Two-replica Redis outage and recovery

**Locally tested, 2026-11-23.** Base Git SHA `c2969b38c8a4c762eccab931a747701a4ea54881` plus the Redis breaker and tests in this worktree. The build succeeded with zero warnings and zero errors. The opt-in suite passed all 15 tests in 65.334 s. The table comes from the single `REDIS_OUTAGE_REPORT` line printed during that suite.

## Reproduce from the repository root

.NET SDK 10.0.112, Python 3.12.14, StackExchange.Redis 2.8.16 and cached `redis:7-alpine` (digest `sha256:ff02b58f971e7d7d156a1267e283fcbbeee91773b6aa36c49dac28ecfe28eadf`) were used for this run.

```bash
export RestoreSources="${NUGET_PACKAGES:-$HOME/.nuget/packages}"
export NuGetAudit=false
# Set this only inside the rdc-project container. On a regular Docker host, omit it.
export EDGE_REDIS_NETWORK_CONTAINER=rdc-project
dotnet build EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj --nologo -v:q
RUN_REDIS_TESTS=1 python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
```

The harness uses one disposable Redis container with persistence disabled, two loopback API processes, one generated quota namespace, four permits per 20-second Redis-time window, and 20 local work slots per replica. Each sample alternates between replicas with up to eight concurrent HTTP clients. Latency is elapsed client time through response body decoding, reported in milliseconds using nearest-rank percentiles. Readiness polls are excluded from the request table.

## Measured results

| Phase | Requests | 200 | 429 | 503 | p50 ms | p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Cold, first request per replica with Redis stopped | 2 | 0 | 0 | 2 | 234.26 | 573.73 |
| Cold, open circuit | 12 | 0 | 0 | 12 | 18.05 | 25.66 |
| Cold, recovered and sharing one quota | 12 | 4 | 8 | 0 | 31.97 | 46.31 |
| Warm, first request per replica during Redis pause | 2 | 0 | 0 | 2 | 1003.02 | 1006.78 |
| Warm, open circuit | 12 | 0 | 0 | 12 | 11.40 | 19.34 |
| Warm, recovery probes during Redis pause | 12 | 0 | 0 | 12 | 19.29 | 1004.77 |
| Warm, recovered with the same exhausted quota | 12 | 0 | 12 | 0 | 12.94 | 24.65 |

All 40 protected-route outage responses had the sanitized `quota_dependency_unavailable` payload. Both replicas stayed live and returned 503 on readiness during the tested outages. Protected-work counters stayed at zero during the cold outage and at four throughout the warm outage and recovery.

Cold recovery took 300.17 ms from the harness's first successful Redis PING to both APIs reporting ready. Warm recovery took 3619.96 ms from the return of `CLIENT PAUSE 3500 ALL` to both APIs reporting ready, including the injected pause. Warm recovery retained the same Redis key and value. With two first-request samples, p95 is the slower request. These timings describe one loopback run.

In the same suite, `test_redis_reply_lost_after_quota_dispatch` used a loopback relay to send a TCP reset after receiving the real Redis Lua reply, before forwarding it to the API. The test observed 503, exactly one Redis charge and zero protected work. After reconnection, the same namespace returned 429 with its one permit still charged. `test_client_abort_during_recovery_keeps_probe_slot` verified fast rejection for a competing request while the abandoned probe was still pending, followed by readiness with the quota key still absent.

Primary failover, lost-state behavior on promotion, and live clock skew remain open.
