# Edge labs — independent acceptance after parallel Codex CLI runs

**Date:** 2026-11-23. **Repository:** `Sergey303/demo`. Three agents were assigned independent worktrees originating at `9275849`: ENS HTTP/Redis, EdgeAI local ONNX, and EIS offline integration. Changes were independently checked and cherry-picked into the dedicated merge worktree before publication.

## What is verified locally

| Verification group | Test count | Result |
| --- | ---: | --- |
| BGP route replay + Anycast failover simulation | 6 + 6 | PASS |
| Rules-only synthetic anomaly evaluation + policy replay | 7 + 10 | PASS |
| EIS original regression + new offline orchestrator/negative tests | 18 | PASS |
| Loopback-only HTTP probe | 6 | PASS |
| Real ASP.NET Core .NET 10 + disposable Redis 7 | 14 | PASS |
| Native CPU ONNX Runtime model/feature tests | 11 | PASS |
| ONNX score + safe policy integration | 2 | PASS |
| **Total non-overlapping tests** | **80** | **PASS locally** |

.NET 10 build: **0 warnings, 0 errors**. All ONNX tests used Python 3.12.14 with pinned NumPy 2.2.6, ONNX 1.19.1, ONNX Runtime 1.23.2 in an isolated virtual environment. `onnxruntime.InferenceSession.run()` executed the model graph on `CPUExecutionProvider`, not a mock. A locally generated synthetic model was verified with SHA-256 `51a458cab734c3f33836940c325feeddce8da966527f586b53e454af5c7ff109`. No third-party training weights or actual customer traffic were used.

The first native-model benchmark on Intel Core i5-12400 recorded **45.9863 ms** model/session initialization and warm p50/p95/p99 of **0.0059 / 0.0084 / 0.0490 ms** over 50 CPU calls after 5 warmups. A second independent 20-call run observed **43.4178 ms** initialization and **0.0034 / 0.0039 / 0.0039 ms** warm p50/p95/p99. These are **machine-local samples**, not latency guarantees or real detection accuracy.

EIS `run.py` now executes the four existing fixture-based stages in isolated offline worker subprocesses with 5-second stage timeouts. `status=ok` means **orchestration succeeded**, while each source is explicitly `simulated`. The checked-in `EVIDENCE-OFFLINE.json` is a reproducible fixture report, not observed cloud traffic. Provider stages are marked `blocked`.

ENS `/ready` is separate from liveness `/health` and does not debit Redis quotas. The Lua script is versioned, and the real disposable Redis tests prove shared rate-limit decisions, time-window boundaries, fail-closed behavior for corrupted state and outages, client cancellation, and later recovery. These are **L7 application controls**, not L3/L4 provider anti-DDoS.

## Reproduction

From repository root (standard library tests):

```bash
python3 -B EdgeIntegratedScenarios/run.py
python3 -B EdgeIntegratedScenarios/task_inventory.py --check
python3 -B -m unittest discover -s EdgeNetworkSecurity/simulator/bgp/tests -v
python3 -B -m unittest discover -s EdgeNetworkSecurity/simulator/anycast/tests -v
python3 -B -m unittest discover -s EdgeAI/scenarios/traffic-anomaly-detection/tests -v
python3 -B -m unittest discover -s EdgeIntegratedScenarios/ai-assisted-ddos-defense/tests -v
python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -v
python3 -B -m unittest discover -s EdgeNetworkSecurity/shared/traffic-generator/tests -v
```

For genuine HTTP and Redis (Docker required only for real Redis integration):

```bash
dotnet build EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj
RUN_REDIS_TESTS=1 python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
# In nested rdc-project: also set EDGE_REDIS_NETWORK_CONTAINER=rdc-project
```

For native CPU inference, see [EdgeAI ONNX instructions](../EdgeAI/implementations/onnx-local/README.md), then run `EdgeIntegratedScenarios/onnx-tests` and `ai-assisted-ddos-defense/onnx_replay.py`. The integration tests passed in the *merged worktree* using the same pinned CPU environment.

## Open work

[Canonical task inventory](TASK-INVENTORY.md) is generated from all three projects' `TASK.md` files, excluding incidental TODO mentions and obvious duplicates. As of this acceptance: **18 unique numbered work areas, 36 deduplicated explicit follow-ups**. Five numbered work areas require provider entitlements, verified API capabilities or approved staging before any `provider-verified` status (EAI-03, EAI-04, ENS-05, ENS-06, ENS-07). Additional local architecture/quality tasks remain open; do not treat the project as feature-complete.

**CI note:** The local acceptance does not imply GitHub Actions has completed or passed for the merged commit. Avoid inventing remote CI success.

**Safety note:** Codex CLI's internal `bwrap` sandbox was unavailable on the nested RDC kernel. The successful runs used isolated, clean Git worktrees and explicit limited file scopes. The original `/workspace/demo` containing unrelated uncommitted changes and the older uncommitted Edge worktree were left untouched.
