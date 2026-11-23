# EAI-08 — repeatable inference evaluation

**P1 · Local synthetic comparison harness implemented.** One versioned report covers the same validated JSONL rows and threshold for each explicitly selected scorer. It records labels-based quality, corpus/model hashes, environment, first prediction, warm p50/p95/p99, process CPU time and throughput. The default rules-only run and invalid-data rejection are tested. The optional CPU scorer uses existing local artifacts and still needs verification in this harness. The existing ONNX tensor-level timing remains available separately. See [README](README.md).

**Open:** independently sourced labeled corpus, cross-run report compatibility tooling, per-scorer RSS and failure distributions, complete HTTP latency and real provider telemetry/cost.
