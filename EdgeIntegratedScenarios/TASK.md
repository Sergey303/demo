# EIS-00 — orchestrated end-to-end demo

**P1. Offline acceptance implemented and locally tested.** Run
`python3 -B EdgeIntegratedScenarios/run.py` from the repository root. The runner
executes the BGP, Anycast, anomaly and policy fixtures and emits versioned JSON
with fixture hashes, source status, counters and failure cases. Each fixture
runs in a separate subprocess with a five-second timeout. Local checks require
Python and the checked-in fixtures. Base SHA
`9275849a9fa3028ef867b5f30608ca50eccb4a1a`.

**Local HTTP plus offline advice is implemented and opt-in tested.** See
[runner](run_http.py) and [experiment instructions](README.md#локальный-http-эксперимент).
The same measured synthetic windows feed both policy modes after the HTTP run.
ASP.NET inline adapter now has real localhost HTTP → EIS CLI → isolated ONNX CPU and deterministic fallback acceptance (opt-in). A persistent bounded worker or async advice queue remains open. Base SHA
`236046772dc330a3fd6043455faf74661bc813b4`.

Cloudflare, Yandex Cloud and EdgeCenter acceptance remains **BLOCKED** on
verified service capabilities and entitlement, approved staging, and separate
provider evidence. See the [README](README.md) and [task inventory](TASK-INVENTORY.md).

- [x] Build a [React visualization](dashboard/TASK.md) of the offline and local HTTP evidence.
- [ ] Compare provider configurations and measure actual cloud paths after prerequisites are met.

Fifth wave adds a [persistent Python ONNX worker](ai-assisted-ddos-defense/persistent_worker.py)
with [strict protocol tests](tests/test_persistent_worker.py). **Persistent ASP.NET
integration passed native CPU E2E** on loopback with bounded HTTP 429 preservation,
process/session reuse and rule-only fallback; one-shot mode remains available. Base SHA `2b7219deb5739b4cb03041660f04452f83a78fac`.
See [evidence](EVIDENCE-WAVE5-PERSISTENT-PYTHON.md).

**API prewarm acceptance pending.** The [opt-in suite](tests/test_inline_end_to_end.py)
covers readiness before HTTP traffic, single-attempt prewarm, native session reuse,
quota preservation, lazy default, and missing-model fallback. Base SHA
`dc24f8557192b93be54890cad6fba81624c5ae20`.

- [ ] Independently run and record the real Linux / .NET 10 / pinned ONNX prewarm E2E after the API change merges.
