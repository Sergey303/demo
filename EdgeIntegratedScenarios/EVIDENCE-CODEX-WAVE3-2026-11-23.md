# Third parallel Codex CLI wave — merged local acceptance

**Date:** 2026-11-23. **Repository:** `Sergey303/demo`. **Base:** `c2969b3` (`main` at wave start). Three Codex CLI agents edited separate clean Git worktrees: ENS Redis resilience, EdgeAI ONNX confinement and EIS React evidence viewer. The workstreams were independently verified and cherry-picked into the merge worktree before publishing.

## What was implemented and checked

| Project | New runnable behavior | Limitations |
| --- | --- | --- |
| [Edge Network Security](../EdgeNetworkSecurity/implementations/local/README.md) | Bounded Redis circuit opening/recovery with one read-only probe per API replica, no quota admitted without confirmed atomic Lua decision; loopback TCP relay test resets a Redis reply after dispatch; two-replica outage and latency report | Still a **local L7 application quota**, not edge L3/L4 mitigation. Initial/half-open probes can temporarily return 503 even if Redis is healthy. Redis Cluster failover, clock skew, ACL/TLS and distributed concurrency remain open |
| [EdgeAI](../EdgeAI/implementations/onnx-local/README.md) | `IsolatedWindowScorer` with killable/reaped Linux subprocess, strict 1–32 window contract, bounded I/O, deadline and deterministic rule-only batch fallback; worker denies socket and process execution through libseccomp; model/manifest and allowed ONNX graph validation | Seccomp does **not** provide general OS, CPU or RAM isolation; caller must trust local artifacts. Existing in-process scorer and historical EIS integrations do not inherit this deadline automatically. Models/data remain synthetic |
| [EdgeIntegratedScenarios](dashboard/README.md) | Accessible React/Vite dashboard showing synthetic BGP/Anycast/anomaly/policy separately from measured localhost HTTP and blocked provider deployments; build-time JSON evidence validation, error and source labels, no remote provider fetch | Static evidence only, not live monitoring; no authenticated user interface or staging deployment. Real cloud mitigation remains unverified |

## Independently rechecked after merging

| Suite | Tests passed |
| --- | ---: |
| BGP simulator | 6 |
| Anycast simulator | 6 |
| Synthetic anomaly evaluator | 7 |
| Policy replay | 10 |
| Bounded HTTP probe | 6 |
| Local synthetic EdgeAI examples | 5 |
| Cloudflare Worker | 5 |
| EdgeCenter policy contract | 6 |
| Yandex Cloud policy contract | 6 |
| **Real .NET 10 ASP.NET Core and disposable Redis 7** | **15** |
| EIS runner and optional actual loopback HTTP experiment | 26 |
| **Native ONNX CPU inference, model verification and isolated worker** | **20** |
| EIS ONNX + policy integration | 3 |
| **React dashboard evidence validation** | **6** |
| **Total (non-overlapping suites)** | **127** |

**All 127 locally run tests passed.** The merged .NET application built with **0 warnings and 0 errors**. The React dashboard built successfully using Vite 7.3.8; Node unit tests passed. Codex separately ran headless Chromium at 320 and 1280 px for keyboard navigation, source disclosures and outbound request checks; independent merged-source verification reran `node --test` and `npm run build`, not a new browser run. Native ONNX tests used the previously verified isolated Python 3.12 environment (NumPy 2.2.6, ONNX 1.19.1, ONNX Runtime 1.23.2), generated the local model and ran actual CPU inference with libseccomp network syscall denial.

**Redis outage measurements** are local samples, not SLA: a merged-worktree 2-replica run observed cold open-circuit p50/p95 **36.32/61.05 ms** and warm open-circuit p50/p95 **10.01/15.07 ms**. The disposable outage scenario also proved recovery and no protected work during failed quota requests. For the original tested run and exact commands, see [Redis report](../EdgeNetworkSecurity/implementations/local/REDIS-OUTAGE-REPORT.md). Numbers change with disk/CPU load and need repeated trials before meaningful performance conclusions.

## Reproduction essentials

```bash
# No providers, no real attack load:
python3 -B EdgeIntegratedScenarios/run.py
python3 -B EdgeIntegratedScenarios/task_inventory.py --check

# Real localhost .NET API + disposable Redis 7 tests, Docker required:
EDGE_REDIS_NETWORK_CONTAINER=rdc-project RUN_REDIS_TESTS=1 python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
RUN_EDGE_HTTP_TESTS=1 python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -v

# Isolated CPU ONNX: install pinned requirements in a venv and generate model first:
python3 -B EdgeAI/implementations/onnx-local/build_model.py
python3 -B -m unittest discover -s EdgeAI/implementations/onnx-local/tests -v
python3 -B -m unittest discover -s EdgeIntegratedScenarios/onnx-tests -v

# Static dashboard, local files only after installing packages:
cd EdgeIntegratedScenarios/dashboard
npm ci --no-audit --no-fund
npm test
npm run build
```

`EDGE_REDIS_NETWORK_CONTAINER` is needed only when Docker port publishing is outside the nested RDC namespace; on a normal Docker host omit that variable. All traffic probes are bounded and restricted to literal loopback addresses.

## Task coverage and acceptance limits

[Task inventory](TASK-INVENTORY.md) now records **19 numbered areas and 32 deduplicated explicit open follow-ups**. The additional UI-specific area `EIS-00-UI` contains two future accessibility/version-compatibility tasks. Five provider areas still require account entitlements, current API verification and approved staging before provider-configured/provider-verified claims.

**Evidence classifications:** `simulated` means a fixture result; `local-tested` means measured loopback behavior or actual CPU execution; `blocked` means real provider stage not checked. These are not interchangeable.

**Not verified:** GitHub Actions success on the final commit, real BGP announcements, real DDoS mitigation, Cloudflare/EdgeCenter/Yandex live deployment, provider cost/latency, independent ML quality or production-grade performance/security.

The original `/workspace/demo` working tree with unrelated Alice WIP and the older uncommitted Edge worktree were left unchanged.
