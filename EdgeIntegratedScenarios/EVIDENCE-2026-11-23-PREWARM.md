# Sixth-wave native ONNX API prewarm acceptance — 2026-11-23

**Scope:** `Sergey303/demo`, Linux RDC isolated merge worktree, .NET 10, Python 3.12 with pinned NumPy/ONNX/ONNX Runtime, Linux libseccomp. **Source status:** LOCAL-VERIFIED and **CI-VERIFIED**. [GitHub Actions run 45219298281](https://github.com/Sergey303/demo/actions/runs/45219298281) completed successfully with all four jobs green, including real native ASP.NET Core → ONNX prewarm on the clean runner.

## Change

`LOCAL_EDGE_ADVISORY_ENABLED=1`, `LOCAL_EDGE_ADVISORY_MODE=persistent` and new **opt-in** `LOCAL_EDGE_ADVISORY_PREWARM=1` schedule a background ONNX/CPU worker startup *after* ASP.NET Core ApplicationStarted. The worker runs as a trusted operator-configured Python subprocess over inherited stdin/stdout, installs a seccomp network/process-denial filter before ONNX loading and reuses a single validated ONNX session. Default prewarm and default advisory remain **disabled**. Prewarm=1 is rejected for disabled or oneshot mode.

A new low-cardinality `/metrics` view exposes `advisoryWorkerReady` (boolean), `advisoryPrewarmAttempts` and `advisoryPrewarmFailures`. These are **model readiness** values; existing `/health` (API liveness) and `/ready` (Redis quota readiness) retain their original meanings. Prewarm consumes no HTTP quota and performs no protected business work. A successful 200 while warmup still holds the process slot returns immediately with safe deterministic `rule-only` advice. 429/503 bypass the scorer. On failed initialization, the process is reaped, failure is counted and later on-demand recovery observes the existing cooldown; shutdown cancels and joins prewarm before disposal.

## Real merged-worktree tests

| Group | Count | Result |
| --- | ---: | --- |
| Real ASP.NET Core .NET 10 + disposable Redis 7, including 8 new background prewarm/failure/shutdown cases | 43 | **PASS** |
| EIS contract, actual HTTP, native seccomp/ONNX worker, real prewarm end-to-end, all opt-in flags enabled | 49 | **PASS, no skips** |
| BGP / Anycast / loopback probe / synthetic anomaly / rule-policy / EdgeAI local examples | 40 | **PASS** |
| Cloudflare local Worker + EdgeCenter and Yandex offline contracts | 17 | **PASS** |
| Actual CPU ONNX model/feature/isolation tests | 20 | **PASS** |
| ONNX policy integration tests | 3 | **PASS** |
| React dashboard evidence parsing | 6 | **PASS**, Vite 7.3.8 build succeeds |
| **Total distinct tests** | **178** | **PASS locally** |

Native prewarm E2E: `RUN_EDGE_INLINE_FULL_TESTS=1 python -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_inline_end_to_end.py -v` passed **5/5**. The test waits for worker readiness **before any** `/api/expensive`, then moves on-disk model/manifest aside to prove that a live initialized ONNX session is reused. Two accepted requests return `onnx-cpu` scores without fallback, and a third remains HTTP 429 with no new scoring. The missing-model prewarm case still serves HTTP 200 via rule fallback, and quota `/ready` remains independent. The ASP.NET fixture tests separately prove process kill/reap on shutdown and during failed startup. `dotnet build` was 0 errors, 0 warnings.

## Observed measurements

All measurements are **individual samples**, not controlled benchmarking or production SLA:

| Configuration | HTTP 200 first | HTTP 200 second | Notes |
| --- | ---: | ---: | --- |
| On-demand persistent, same opt-in E2E suite | 1,623.95 ms | 2.46 ms | Cold model startup occurs in first request |
| Prewarmed, first native E2E run | **82.89 ms** | **4.10 ms** | Readiness verified before first request |
| On-demand persistent, second full integrated run | 1,343.07 ms | 2.63 ms | Separate sample |
| Prewarmed, second full integrated run | **37.04 ms** | **3.23 ms** | Independent repeat, same E2E invariants |

Bounded standalone localhost latency sample: `EdgeIntegratedScenarios/sample_latency.py`, **2 RPS × 5 seconds = 10 requests**, loopback only. All 10 responses were HTTP 200 with native ONNX-score; **0 HTTP/transport failures, 0 worker restarts and 0 fallbacks**. Warm **response-header** latency: p50 **2.27 ms**, p95/p99 **44.45 ms** (nearest-rank method, 10 points; p95 and p99 are both the maximum). The model had already been prewarmed and `advisoryPrewarmAttempts=1`, `advisoryPrewarmFailures=0`, and `started=0` before sampling. These percentile figures are **not stable estimates**: N=10, no CI performance reference, no controlled CPU/disk memory profile.

## Independent clean GitHub runner verification

The clean `onnx-cpu` job explicitly restored pinned .NET dependencies once and then performed the strict native HTTP/ONNX E2E under an isolated Python virtual environment. All five `test_inline_end_to_end` cases passed without skips, along with the original ONNX suites. **Individual** runner samples: on-demand persistent first/warm HTTP **554.71/5.84 ms**; prewarmed first/second HTTP **21.27/5.43 ms**; the earlier one-shot path **640.73 ms**. This corroborates the qualitative latency improvement on two different machines, **not** a general SLO or production benchmark.

## Replicate (no public traffic)

```bash
# run from repo root, .NET 10 and pinned Python ONNX venv:
dotnet build EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj
RUN_EDGE_INLINE_FULL_TESTS=1 python -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_inline_end_to_end.py -v

# Real Redis (opt in explicitly; disposable Docker Redis image must exist):
RUN_REDIS_TESTS=1 python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
# Add EDGE_REDIS_NETWORK_CONTAINER=rdc-project only when using the nested RDC Docker namespace

# Bounded localhost sampler against explicitly started local API:
python3 -B EdgeIntegratedScenarios/sample_latency.py --port 5088 --rps 2 --seconds 5
```

`sample_latency.py` is restricted to **127.0.0.1**, **1–10 RPS** and **1–60 seconds**, uses a maximum 2-second transport deadline and does not follow public redirects or use proxy configuration.

## Remaining limitations and unfinished work

- Warmup is asynchronous and **not instant**: early HTTP 200 may receive `rule-only/unavailable` until initialization completes. Operators should poll the low-cardinality readiness metric with a bounded deadline if genuine CPU inference is required before traffic.
- The process is shared only within one API replica; multi-replica concurrency and startup fairness, outage recovery under sustained load and Redis primary failover remain unmeasured.
- Need repeated safe sustained-load experiments with CPU/RAM budgets, p50/p95/p99 over statistically meaningful samples, bounded cold-start distribution, resource exhaustions and safe shutdown race coverage.
- The synthetic-trained ONNX model is **not** a validated DDoS detector. Model advice remains `allow/observe` and `status=simulated`; it never blocks or overrides HTTP 429/503. All cloud providers remain unconfigured/unverified.

[Checklist](../EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/TASK.md) · [Project README](README.md) · [Task inventory](TASK-INVENTORY.md).
