# Redis primary promotion and quota loss

**Local-tested, 2026-11-24.** Base SHA `3ef2b6d`. Build: 0 warnings, 0 errors. Three bounded functional tests passed in 30.471 s on RDC. No sustained load measurements were performed.

## Reproduce

From the repository root, build `src/LocalEdgeApi/LocalEdgeApi.csproj` under this directory (use the locally cached NuGet source if offline). Then:

```sh
cd EdgeNetworkSecurity/implementations/local/tests
# Set EDGE_REDIS_NETWORK_CONTAINER=rdc-project only for the nested RDC environment.
RUN_REDIS_TESTS=1 python3 -B -m unittest test_redis_promotion -v
```

Two disposable Redis 7 containers (96 MiB and 0.5 CPU each, cached image), two live API processes and one stable loopback TCP endpoint. The harness waits for replication, consumes four permits in a 60-second window, and deliberately reparents the replica to an unreachable endpoint for lost-state cases. It fences the old primary by stopping its container, confirms 503 from both API processes, manually promotes the replica and switches the loopback endpoint. It verifies the same window, exact Redis state, HTTP decisions and combined protected-work counters. Neither API is restarted.

| Replicated charges before promotion | State on promoted primary | HTTP results after promotion | Total protected work in same window |
| ---: | --- | --- | ---: |
| 4 | bucket:4 | 429, 429, 429, 429, 429 | 4 |
| 2 | bucket:2 | 200, 200, 429, 429, 429 | 6 |
| 0 | absent | 200, 200, 200, 200, 429 | 8 |

All three scenarios returned 503 during the old-primary outage, recovered readiness, and reached the expected final Redis count of four. The last two are **passing reproductions of an invariant violation**, not evidence that quota preservation passed.

## Consequences and next acceptance gate

A Lua transaction is atomic on the serving primary, not durable across asynchronous promotion. With a fixed limit L and m lost admitted charges, a single fenced promotion within a window permits up to L+m protected operations (at most 2L for that single promotion); repeated stale promotions and split brain are outside that bound. The tests do not implement Sentinel, automatic discovery, or a consensus-backed quota.

A conservative candidate is a promotion-aware admission gate: externally fence the old writer, close admission on all replicas, and reopen only after one full configured quota window has elapsed since verified fencing, with explicit clock assumptions. Gate state must be shared or enforced by a trusted common ingress and survive its own restart; a local per-process sleep or TCP reconnect alone is insufficient. Unknown fencing or clock state must keep admission closed. Test lost-all and lost-partial cases, restart, old-primary return, and clock uncertainty before claiming the invariant. Redis WAIT can reduce replication-loss risk but does not by itself guarantee durable promotion or consensus.

Live clock skew, automatic failover, production fencing, split brain, and strict admission preservation remain open. The tests use bounded synthetic traffic and no external services.
