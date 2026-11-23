# EIS-00 — orchestrated end-to-end demo

**P1. Offline acceptance implemented and locally tested.** Run
`python3 -B EdgeIntegratedScenarios/run.py` from the repository root. The runner
executes the BGP, Anycast, anomaly and policy fixtures and emits versioned JSON
with fixture hashes, source status, counters and failure cases. Each fixture
runs in a separate subprocess with a five-second timeout. Local checks require
Python and the checked-in fixtures. Base SHA
`9275849a9fa3028ef867b5f30608ca50eccb4a1a`.

Cloudflare, Yandex Cloud and EdgeCenter acceptance remains **BLOCKED** on
verified service capabilities and entitlement, approved staging, and separate
provider evidence. See the [README](README.md) and [task inventory](TASK-INVENTORY.md).

- [ ] Build a React visualization of the offline evidence.
- [ ] Compare provider configurations and measure actual cloud paths after prerequisites are met.
