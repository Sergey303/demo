# EIS-01 — rule-only vs AI-assisted decision pipeline

**P0; status PARTIAL — `policy.py`, synthetic replay (`replay.py`), 12-case fixture, confusion matrices, bounded audit and failure tests DONE.** Remaining: versioned external contracts, provider SDK adapters (not in the policy), asynchronous timeouts, signed policy updates and independently sourced holdout. Run `python3 -m unittest discover -s EdgeIntegratedScenarios/ai-assisted-ddos-defense/tests -v`.

Flow: synthetic request window → deterministic rule-only decision → optional anomaly score → policy-controlled recommendation → audit and offline comparison.

Hard invariants:
- model failure, timeout, malformed score => deterministic rule-only decision;
- uncalibrated AI score never causes automatic hard block by itself;
- baseline never weakened for already hard-blocked requests;
- no PII/secret in audit output and no network calls;
- all decisions include versioned policy ID, source and simulated status.

Acceptance tests: normal, legitimate burst (false positive), bot-like burst, missing model, NaN/out-of-range score, conflicting policy, threshold boundary and deterministic replay. Benchmark false positive/negative, latency and load without fake claims. TODO: provider adapters, distribution across sites, challenge response and signed policy updates.
