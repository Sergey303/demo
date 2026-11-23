# EIS-01 — rule-only vs AI-assisted decision pipeline

**P0; status PARTIAL — policy.py exists with offline tests; replay/audit and failure injections TODO.** Extend in `policy.py`, `tests/` and synthetic fixture. Import explicit contracts from EdgeNetworkSecurity and EdgeAI or use a narrow transport shape; NO provider SDK coupling.

Flow: synthetic request window → deterministic rule-only decision → optional anomaly score → policy-controlled recommendation → audit and offline comparison.

Hard invariants:
- model failure, timeout, malformed score => deterministic rule-only decision;
- uncalibrated AI score never causes automatic hard block by itself;
- baseline never weakened for already hard-blocked requests;
- no PII/secret in audit output and no network calls;
- all decisions include versioned policy ID, source and simulated status.

Acceptance tests: normal, legitimate burst (false positive), bot-like burst, missing model, NaN/out-of-range score, conflicting policy, threshold boundary and deterministic replay. Benchmark false positive/negative, latency and load without fake claims. TODO: provider adapters, distribution across sites, challenge response and signed policy updates.
