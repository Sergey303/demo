# EIS-01 — rule-only vs AI-assisted decision pipeline

**P0; status PARTIAL — `policy.py`, synthetic replay (`replay.py`), 12-case fixture, confusion matrices, bounded audit and failure tests DONE.** The versioned Python advisory CLI is implemented. Remaining: independently verified API adapter and request-time limits, provider SDK adapters, signed policy updates and independently sourced holdout. Run `python3 -m unittest discover -s EdgeIntegratedScenarios/ai-assisted-ddos-defense/tests -v`.

Flow: synthetic request window → deterministic rule-only decision → optional anomaly score → policy-controlled recommendation → audit and offline comparison.

Hard invariants:
- model failure, timeout, malformed score => deterministic rule-only decision;
- uncalibrated AI score never causes automatic hard block by itself;
- baseline never weakened for already hard-blocked requests;
- no PII/secret in audit output and no network calls from the decision path;
- all decisions include versioned policy ID, source and simulated status.

Acceptance tests: normal, legitimate burst (false positive), bot-like burst, missing model, NaN/out-of-range score, conflicting policy, threshold boundary and deterministic replay. Benchmark false positive/negative, latency and load without fake claims. TODO: provider adapters, distribution across sites, challenge response and signed policy updates.

EIS-00 runs this replay in a bounded subprocess and records model-outage
fixtures as rule-only fallbacks. The subprocess deadline bounds the whole
fixture stage. The [local HTTP experiment](../run_http.py) compares offline decisions
on the same measured HTTP windows and gives optional ONNX scoring a bounded
subprocess with rule-only fallback. The [one-shot advisory CLI](inline_advisory.py) uses the isolated ONNX scorer
and returns advisory-only results. The opt-in ASP.NET Core adapter is now locally verified
with actual HTTP 200/429 and native ONNX CPU inference; slow per-request process
startup remains a P0 latency/architecture limitation. See the [CLI contract and evidence](../README.md#inline-advisory-cli).

### Fifth wave: persistent Python transport

Implemented standalone `persistent_worker.py`: one filtered CPU session,
ready handshake, bounded strict serial NDJSON, no request echo, fixed failures.
Base SHA: `2b7219deb5739b4cb03041660f04452f83a78fac`.
See [protocol](../README.md#fifth-wave-persistent-onnx-transport-standalone),
[tests](../tests/test_persistent_worker.py) and
[evidence](../EVIDENCE-WAVE5-PERSISTENT-PYTHON.md).
**Pending:** independent persistent ASP.NET adapter acceptance, bounded parent
queue/concurrency/restart behavior in actual HTTP, measured p95/p99 and soak.
The previous one-shot contract remains unchanged. Standalone transport tests
must not be described as persistent HTTP integration evidence.
