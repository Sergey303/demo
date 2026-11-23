# Fifth wave — persistent localhost ONNX, merged acceptance

**Date:** 2026-11-23. **Repo:** `Sergey303/demo`. Two independent Codex CLI worktrees began from `2b7219d` and were cherry-picked into a clean Edge merge worktree. Python transport and ASP.NET code were separately tested, then rechecked together against genuine native ONNX. No original `/workspace/demo` Alice changes were edited.

## Implementation and correctness boundary

```text
local HTTP 127.0.0.1 /api/expensive
 -> existing ASP.NET Core 10 rate limiter or shared Redis 7 Lua quota
 -> existing bounded protected work; RELEASE per-process business semaphore
 -> optional advisory (disabled by default)
 -> LOCAL_EDGE_ADVISORY_MODE=persistent (explicit opt-in)
 -> one inherited private stdin/stdout pipe to a serial Python -I -B subprocess
 -> validate {"schema_version":1,"kind":"ready","model":"onnx-cpu"} at startup
 -> per 200: <=4096-byte integer window JSON line (aggregate counters only)
 -> seccomp-filtered Python: trusted graph & manifest SHA validated once
 -> ONNX Runtime CPU session reused for sequential scores
 -> <=2048-byte strict JSON response, status "simulated", action "allow"/"observe"
 -> original HTTP 200 JSON plus advisory: NEVER autonomous hard block
```

The scorer gets no IP address, account, token, header, content or client-supplied model path. The launched process is restricted to operator-configured absolute paths; the environment is cleared and no shell is used. The Linux worker installs a libseccomp filter against socket/process-execution syscalls before importing ONNX and loading trusted local artifacts. This **is not full CPU/RAM containment or authenticated RPC**; the pipes are process-inherited, not a network listener.

HTTP 429, quota-backend 503, and concurrency 503 skip scoring entirely. Any missing/broken worker, invalid JSON, deadline, cancellation, unavailable model or crashed subprocess fails to deterministic rule-only advice without overriding quota admission. Only one score is in flight per API replica, with no queue. On a failed exchange the .NET parent kills/reaps the process and observes a 750ms recovery cooldown. An application shutdown also tears down the worker. Existing one-shot mode remains available when explicitly enabled, and advisory is disabled by default.

## Measured native HTTP results

All numbers below are **single observations** on the same resource-constrained RDC workstation, not distributional percentiles or SLA.

| Repeated actual ASP.NET → Python → ONNX experiment | Cold HTTP 200 | Subsequent warm HTTP 200 | Other observations |
| --- | ---: | ---: | --- |
| First independent integration run | 3,816.63 ms | **4.24 ms** | Genuine CPU model output on both, 429 not scored |
| Second independent integration run | 2,975.05 ms | **8.03 ms** | Two valid CPU scores; zero worker restarts |
| Full native test batch | 3,250.66 ms | **13.25 ms** | Quota unchanged, model reused |
| Repeated full native batch | 4,429.31 ms | **4.35 ms** | Quota unchanged, no fallback in persistent mode |

The warm path avoids repeatedly launching a Python interpreter and loading a native ONNX session. Previously a one-shot request took about 2.5–2.7 s even when accepted. With the persistent mode, the warm samples above are approximately **4–13 ms**, but **cold latency remains 3–4.5 s**. Note that one-shot mode has a hard 2.5/3.0 s budget; during resource contention it correctly returned `rule-only/timeout` instead of a late ONNX score. Tests now accept either native execution or safe timeout in *one-shot* mode, whereas the **persistent native E2E requires actual ONNX execution**. Never interpret these sparse measurements as statistically significant speedups or a general DDoS-detection result.

## Independent tests

| Group, executed after merging | Tests passed |
| --- | ---: |
| BGP (6), Anycast (6), bounded HTTP probe (6), anomaly baseline (7), EdgeAI scenario examples (5), policy replay (10), Cloudflare Worker (5), two RU provider offline contracts (12) | 57 |
| **Real ASP.NET Core/Redis + both advisory modes** (includes 10 new persistent loopback HTTP tests) | **35** |
| **EIS normal, real HTTP, strict Python worker and opt-in native ONNX E2E** | **47** |
| ONNX model/native worker/feature unit tests | 20 |
| ONNX assisted policy integration | 3 |
| React evidence dashboard normalizer tests | 6 |
| **Total, no duplicate suites** | **168** |

The merged .NET 10 build passed with **0 errors, 0 warnings**. All **35 HTTP/Redis tests** passed with disposable loopback Redis 7. All **47 EIS tests passed with relevant opt-in environment flags enabled** (no skips); the strict persistent worker was tested with pinned native ONNX Runtime on Linux. The React dashboard build also passed on Vite 7.3.8. Provider tests are offline contracts only; Cloudflare, EdgeCenter and Yandex Cloud are **not** deployed or provider-verified.

### Reproduction

```bash
# From repo root, Python 3.12 and .NET 10:
dotnet build EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj
python3 -B EdgeIntegratedScenarios/task_inventory.py --check
python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v

# Opt-in real disposable Redis 7 (normal Docker host; rdc-project adds EDGE_REDIS_NETWORK_CONTAINER=rdc-project)
RUN_REDIS_TESTS=1 python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v

# Use an isolated venv with pinned EdgeAI/implementations/onnx-local/requirements.txt
RUN_EDGE_PERSISTENT_ONNX_TESTS=1 python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_persistent_worker.py -v
RUN_EDGE_INLINE_FULL_TESTS=1 python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_inline_end_to_end.py -v

# All EIS suites including actual local HTTP and both CLI native variations:
RUN_EDGE_HTTP_TESTS=1 RUN_EDGE_INLINE_FULL_TESTS=1 RUN_EDGE_INLINE_ONNX_TESTS=1 RUN_EDGE_PERSISTENT_ONNX_TESTS=1 \
 python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -v
```

**Remaining P0:** prewarm the isolated worker (avoid the 3–4.5 s first request) or move advisory execution to a bounded asynchronous/outbox queue; measure sustained safe localhost traffic, p50/p95/p99, failure/restart frequency, memory/CPU and multi-replica fairness. Real security attack detection requires external holdout data and independently validated model quality. This proof does not authorize automatic WAF blocking.

[Previous inline one-shot evidence](EVIDENCE-2026-11-23-INLINE-API.md) · [Python worker contract](EVIDENCE-WAVE5-PERSISTENT-PYTHON.md) · [task inventory](TASK-INVENTORY.md).

**Remote CI status** must be separately confirmed on the final published commit; local acceptance does not imply GitHub Actions success.
