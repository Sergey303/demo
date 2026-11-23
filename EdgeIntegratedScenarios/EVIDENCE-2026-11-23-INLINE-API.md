# Edge inline AI advisory — independent acceptance, wave 4

**Date:** 2026-11-23. **Repository:** `Sergey303/demo`. This report covers the local implementation merged from two disjoint Codex CLI worktrees (Python contract and ASP.NET Core adapter), followed by separate reviewer corrections and real localhost testing.

## The actual vertical slice

```text
127.0.0.1 client
   -> .NET 10 /api/expensive
   -> existing local or shared Redis quota and local semaphore
       - 429 / 503: no model call, same original HTTP outcome
       - admitted 200: complete protected work; RELEASE semaphore
   -> optional advisory process (enabled only by trusted operator settings)
   -> Python inline_advisory.py, strict <=4096 byte JSON window
   -> IsolatedWindowScorer -> Linux seccomp-protected ONNX CPU child
   -> safe 200 JSON with advisory {allow|observe, score, source, fallback}
```

**Never** use model score to admit a request, defeat a quota, block a user, or turn a 429/503 into a 200. The recommendation is labelled `simulated` even when the score came from actual CPU ONNX. The request-window input comprises only per-replica aggregate counts and integer observation duration/baseline; it contains no IP, account, token, body, or headers. The window is **not a distributed/real-world attack detector**.

With `LOCAL_EDGE_ADVISORY_ENABLED` unset, the application retains its earlier response and request limits. With it enabled, the .NET process starts a trusted absolute-path Python interpreter/script with **no shell** and a cleared process environment, bounds the output, checks its exact response schema, enforces an outer deadline and kills/reaps a hung process tree. One worker is allowed per API process. When it cannot produce a valid score, a deterministic **C# implementation of EdgeAI's rules baseline** returns `rule-only` with `timeout` or `unavailable`, preserving the original HTTP 200. The Python CLI separately implements a strict one-request boundary and runs the isolated ONNX child with seccomp socket/process syscall denial. These controls are **not** full CPU/RAM isolation.

## Real execution evidence

| Scenario | Observed result |
| --- | --- |
| Real ASP.NET Core with synthetic local ONNX artifacts via pinned venv | HTTP **200**, `advisory.source=onnx-cpu`, `fallback=none`, finite score **0.1848698258**; response **2,609.08 ms** |
| Immediate second accepted HTTP request with same mode | HTTP **200**, `advisory.source=onnx-cpu`, score **0.1850088537**; response **2,544.68 ms** |
| Automated opt-in true HTTP → Python CLI → native ONNX acceptance | HTTP **200** with `onnx-cpu`, followed by **429** with unchanged quota; observed HTTP **2,707.89 ms** |
| Automated opt-in model-missing case | HTTP **200** with `rule-only`, `fallback=unavailable`; quota and protected work unchanged |
| Malformed/hanging/crashing Python fixture | HTTP 200 with deterministic `rule-only`; worker kill and reaping, no queue or concurrency-slot starvation |
| Redis unavailable or quota exhausted | Existing **503/429**; **zero advisory invocations** for these responses |
| Default advisory disabled | Existing JSON `{"status":"processed"}` and current rate-limit behavior preserved |

All traffic remained on literal loopback. No cloud providers, public DDoS traffic, customer data or production deploy were used.

**Important latency finding:** Both the first and next ONNX-backed requests took about **2.5–2.7 seconds** on the tested RDC environment. The one-shot interpreter and model initialization impose per-request costs even when the model itself executes quickly. Typical HTTP clients with a 2-second deadline can time out before a successful response. A 1.5-second server timeout instead forces a predictable fallback for an ONNX scorer that cannot initialize in time. This is a **P0 architecture/performance limitation**, not acceptable latency for a production edge protection path. The next design should favor a bounded, authenticated, long-lived local inference worker or an async/outbox-backed advisory process that does not delay admitted HTTP responses; then measure p50/p95/p99 and CPU/RAM with safe synthetic traffic.

## Regression and test accounting

| Suite group | Passed |
| --- | ---: |
| Existing BGP, Anycast, heuristic, policy, probe, EdgeAI scenarios, Cloudflare and two RU offline provider contracts | 57 |
| Merged real .NET 10 API, Redis 7 and inline adapter | 25 |
| Existing + new EIS replay, actual HTTP, CLI contract and opt-in full integration | 36 |
| Real native ONNX model, isolated worker and feature tests | 20 |
| EIS ONNX+policy integration tests | 3 |
| React evidence dashboard normalizer tests | 6 |
| **Total non-overlapping tests** | **147** |

Merged suite: `dotnet build` **0 errors/0 warnings**, 25 ASP.NET/Redis cases passed, 36 EIS cases counted. Three tests requiring explicit native/localhost opts were skipped in the default EIS run **and successfully executed separately**: one CLI native ONNX and two complete HTTP→ONNX tests. Prior to the new wave, the existing 57 base, 20 ONNX, 3 ONNX/EIS and 6 dashboard tests were also independently passed. No GitHub Actions outcome is claimed in this document until that run is checked.

### Reproduce

From repository root with .NET 10 and Python 3.12:

```bash
dotnet build EdgeNetworkSecurity/implementations/local/src/LocalEdgeApi/LocalEdgeApi.csproj
python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v
python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_inline_advisory.py -v
# With disposable Redis 7 on local Docker:
RUN_REDIS_TESTS=1 python3 -B -m unittest discover -s EdgeNetworkSecurity/implementations/local/tests -v

# In a venv with pinned EdgeAI/implementations/onnx-local/requirements.txt and Linux libseccomp:
RUN_EDGE_INLINE_ONNX_TESTS=1 python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_inline_advisory.py -v
RUN_EDGE_INLINE_FULL_TESTS=1 python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_inline_end_to_end.py -v
```

The Docker variable `EDGE_REDIS_NETWORK_CONTAINER=rdc-project` is required only in the nested RDC environment; omit it on a normal Docker host.

## Open work

The generated [task inventory](TASK-INVENTORY.md) now tracks **19 numbered areas and 33 explicit deduplicated follow-ups**. Completing the optional inline adapter closed one item, while making the latency and sustained-load acceptance criteria explicit added two. Provider account entitlements, Redis primary failover/clock skew, hard resource quotas, safe long-lived ONNX execution and independently sourced evaluation data remain outstanding. These demos are not production-verified.
