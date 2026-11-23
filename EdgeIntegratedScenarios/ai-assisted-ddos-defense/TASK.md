# EIS-01 — rule-only vs AI-assisted decision pipeline

**P0; status PARTIAL — `policy.py`, synthetic replay (`replay.py`), 12-case fixture, confusion matrices, bounded audit and failure tests DONE.** Remaining: versioned external contracts, provider SDK adapters (not in the policy), inline API scoring and request-time limits, signed policy updates and independently sourced holdout. Run `python3 -m unittest discover -s EdgeIntegratedScenarios/ai-assisted-ddos-defense/tests -v`.

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
subprocess with rule-only fallback. Inline API integration and per-request
inference isolation remain open.
