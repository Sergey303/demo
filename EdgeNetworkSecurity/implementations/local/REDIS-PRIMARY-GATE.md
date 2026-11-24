# Fail-closed primary admission gate

The [historical reproduction](REDIS-PROMOTION-REPORT.md) showed 4, 6 and 8 protected operations with a limit of four when promotion retained 4, 2 or 0 charges. A reachable Redis is not sufficient authority to reset admission.

## Protocol and trust boundary

Every Redis-mode API requires the absolute path LOCAL_EDGE_REDIS_PRIMARY_GATE. A trusted single-host controller owns this file. All replicas must use the same file, window, namespace and permit configuration. No gate, malformed gate, a mismatching window, closed gate, a different run_id, or a non-primary role produces sanitized 503; there is no unsafe fallback or auto-enrollment. The non-Redis single-process demo is unchanged.

The gate is an atomic manifest with the window in milliseconds and the 40-hex Redis run_id, or the literal closed marker. The API reads the pin per operation, and verifies Redis INFO server/replication within the same Lua execution that admits work. A restarted API cannot authorize a new primary by itself. Readiness uses the same script in non-mutating probe mode. The protocol assumes a trusted local filesystem and Redis administrative plane; an API cannot distinguish deliberately restored/deleted quota state under the same authorized run_id.

The Linux controller writes by atomic replacement and fsync, serializes commands with flock, and uses a monotonic wait. A controller killed during quarantine leaves the gate closed; a subsequent invocation waits the full interval again. Never change window/permit configuration or manually publish a new pin while serving requests.

## Manual promotion runbook

1. Close the shared gate with `python3 tools/primary_gate.py /absolute/private/primary` (paths relative to this directory). Confirm both APIs return 503.
2. Independently fence the old writer so it cannot admit any more operations, including delayed requests. In the disposable lab this means stopping its Redis container. Do not attest fencing merely because a connection failed.
3. Promote the replica and switch the stable endpoint; obtain its run_id from Redis INFO server. It must be a primary.
4. Run `python3 tools/primary_gate.py /absolute/private/primary --run-id RUN_ID --window W --max-clock-delta-ms D --old-primary-fenced`. The operator attests verified fencing and the clock bound. This invocation closes the gate, waits at least W seconds plus D milliseconds using monotonic time, then publishes the new pin. It must start after fencing. For containers sharing one Linux host clock, D=0 is the lab assumption.
5. Confirm both APIs ready and share one quota. An unexpected old/new node is rejected by the pinned script.

The controller does not itself discover or fence a server. Its attestation is a trusted operational input, not an automatically verified lease. With stable clocks advancing at the assumed rate, the additional D must bound the difference between old and new Redis clocks at the relevant times. A full window plus that bound after fencing prevents reusing an old admission bucket. Unknown clock bounds, fencing or configuration mean keep the gate closed. Automatic consensus, distributed manifest storage, network partitions, clock jumps, arbitrary deletion/rollback on an authorized process, and production ACL/TLS remain separate tasks. This lab is intentionally single-host and sacrifices availability during promotion. No production or load-performance claim.

## Verified local evidence (2026-11-24)

Base 3279090; .NET build: zero warnings/errors. On RDC with cached Redis 7, all three promotion scenarios passed (61.548 s): retained 4, 2 and 0 charges each resulted in five 503 responses and exactly four operations in the original window. A fresh API process remained closed with the old pin. Full-loss recovery waited 30 seconds, then admitted exactly four new-window operations and rejected the fifth with 429. A repeat of that scenario (50.732 s) also restarted the old primary and redirected the endpoint: both live APIs rejected it, without creating a quota key there.

The final 14-test Redis/controller regression passed in 45.862 s, including cancellation, lost reply, cold/warm outage, namespace isolation, atomic quota, rollover, missing/malformed/wrong-window gate, and controller crash/restart. Reproduce from this directory after building the API:

```sh
cd tests
RUN_REDIS_TESTS=1 python3 -B -m unittest test_redis_promotion test_redis_shared_quota test_primary_gate -v
```

Set EDGE_REDIS_NETWORK_CONTAINER=rdc-project only in that nested lab environment. These are bounded functional tests, not throughput or sustained-load measurements.
