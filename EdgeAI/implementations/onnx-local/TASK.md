# EAI-02 — Codex CLI: local ONNX inference

**Status: LOCAL CPU VERIFIED (2026-11-23).** Ran the generator, scorer, 11 tests and 50-iteration benchmark in an isolated venv on Linux x86-64. See the [exact run results](README.md#verified-cpu-run-2026-11-23). Worktree base SHA was `9275849a9fa3028ef867b5f30608ca50eccb4a1a`.

## Implemented

- [x] `features.py` — bounded, versioned numerical request-window feature contract, no IP/PII.
- [x] `build_model.py` — deterministic training on authored synthetic windows, ONNX `MatMul/Add/Sigmoid`, model SHA manifest with provenance, no downloads.
- [x] `runtime.py` — ONNX Runtime `CPUExecutionProvider`, input/output shape checks, model identity/hash checks, bounded batches (1..32), fail-fast on corrupt model.
- [x] `benchmark.py` — actual CPU session initialization and warm p50/p95/p99 timings (measurement on successful execution).
- [x] `tests/test_features.py`, `tests/test_model.py` — boundary, determinism, integrity, numerical comparison, no-socket inference and benchmark acceptance.
- [x] `EdgeIntegratedScenarios/ai-assisted-ddos-defense/onnx_replay.py` — integrated scoring with observe-only policy, verified by separate test.

## P0 verification and follow-up

- [x] Run the standalone README commands with pinned dependencies and native `CPUExecutionProvider`. Local evidence covers generation, scoring, integrity and shape regressions, and warm inference timing.
- [ ] Confirm the `onnx-cpu` GitHub Actions job and repeat on the RDC machine when available.
- [ ] Add hard wall-clock timeouts/isolation (killable subprocess or dedicated restricted worker). An ONNX Runtime session API call itself cannot currently be bounded by our request timeout.
- [ ] Validate tampering of manifest itself, graph op allowlist, model size/metadata and failure modes of malformed ONNX protobufs.
- [ ] Add an independently sourced/licensed dataset, trained/held-out split, calibration error, false-positive analysis for legitimate bursts and drift detection.
- [ ] Make model architecture/feature versions and test scenario snapshots backward-compatible or explicitly reject upgrades.

## P1 architecture

- [ ] Add .NET 10 inference adapter and real edge-device/WASM execution under an explicit hardware budget.
- [ ] Optional HTTP API integration: expose advisory score as `observe` only, with bounded timeout, deterministic fallback and no model-driven hard blocks.
- [ ] CPU, RAM, p95 latency, throughput/cold start and network-disabled tests on Windows/Linux; publish measured environment details.
- [ ] Provider parity with Cloudflare Workers AI and Yandex Cloud on comparable tasks/models; do not imply regional cloud inference is true edge execution.

No cloud credentials, personal data, public load/attack traffic, third-party model weights or implicit downloads. Further TODOs stay next to code with falsifiable acceptance criteria.
