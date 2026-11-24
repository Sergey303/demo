# Quota v2: monotonic clock and durable watermark

## Problem and solution

The v1 Lua script used Redis TIME and a calendar-time TTL. A forward wall-clock jump could advance the admission bucket or expire the key, and a subsequent backward jump could reopen a previously exhausted bucket. Pinning a primary does not address this within the same Redis process.

v2 samples Linux CLOCK_MONOTONIC via .NET Stopwatch at dispatch, and submits it to the atomic Lua script. All trusted API processes and the gate controller must share the Linux boot ID and time namespace. The v2 manifest includes both identifiers; missing or foreign clock domains fail closed. Neither the Redis calendar clock nor a client header supplies time. The admitted operation belongs to its sampled dispatch window; a delayed command older than the retained bucket is rejected rather than rewinding it.

The Redis key is now demo:edge:quota:v2:<namespace> and stores bucket:count without an expiry. Only a strictly newer sampled bucket resets the counter. The fixed namespace is bounded by operator configuration, not client data. Run dedicated Redis with noeviction; operators must not delete, expire, roll back or evict active watermarks. Administrative state loss inside the same pinned process remains outside the guarantee. No unbounded dynamic per-user keys are created.

## Migration

Stop admission in v1 and fence all old API writers (do not run both versions against different quota keys). Close the old manifest. Wait at least the full configured window after fencing, plus any required conservative clock margin for the previous protocol, and enroll v2 with the controller. A v1 manifest cannot authorize v2. A host reboot or different time namespace cannot reuse the previous manifest; close admission, fence old writers, wait the full window, and explicitly initialize a fresh namespace or retire the old watermark under operator control. Never reset state while serving. v2 is Linux single-clock-domain only; automatic cross-host coordination is not provided.

## Real Redis clock fault injection

Local-tested on 2026-11-24, base cf8d7b1. No kernel or host clock was changed. A test-only C LD_PRELOAD shim changed the calendar time returned to one disposable Redis 7 process. The test independently verified actual Redis TIME, used two real ASP.NET Core API processes and a limit of four per 30-second monotonic window.

| Injected calendar offset | Quota state | Two API responses |
| --- | --- | --- |
| +3600 seconds | unchanged, 4 charges | 429, 429 |
| -3600 seconds | unchanged, 4 charges | 429, 429 |
| 0 seconds | unchanged, 4 charges | 429, 429 |

All cases retained PTTL=-1. An API restart could not reopen the exhausted quota. The actual next monotonic window admitted a new operation. A deliberately delayed Lua command from the previous bucket was rejected without changing state. The clock test passed in 30.929 s; the Redis/controller regression passed 14 tests in 46.838 s. The .NET build reported zero warnings/errors.

Reproduce on x86-64 Linux with GCC and cached redis:7-alpine, after building the API:

```sh
cd EdgeNetworkSecurity/implementations/local/tests
RUN_REDIS_CLOCK_TESTS=1 python3 -B -m unittest test_redis_wall_clock -v
RUN_REDIS_TESTS=1 python3 -B -m unittest test_redis_shared_quota test_primary_gate test_redis_promotion -v
```

Set EDGE_REDIS_NETWORK_CONTAINER=rdc-project only for that nested lab. The fault injector is confined to the disposable Redis process and does not require CAP_SYS_TIME, privileged containers, or changing the host clock. These are bounded functional checks, not sustained-load measurements.

The three promotion regressions also passed with v2 in 58.392 s, including total and partial state loss, stale gate, API restart, quarantine recovery and return of the old primary. Total: 18 distinct targeted tests passed locally. The isolated clock test runs locally with RUN_REDIS_CLOCK_TESTS=1. CI enablement is retained on local branch edge-clock-ci-pending: the current push credential lacks workflow scope. CI result for this revision is not yet confirmed.
