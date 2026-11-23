# EAI-08 — repeatable inference evaluation

**P1; PARTIAL.** [Local ONNX benchmark](../implementations/onnx-local/benchmark.py) records CPU session-init and warm p50/p95/p99 timings on deterministic synthetic holdout features, conditioned on successful real native runtime execution. Shared JSONL inputs and comparison schema remain TODO. Metrics: cold vs warm p50/p95/p99, CPU/RAM, throughput, error rate, quality against heldout labels and cost if proven. Record versions, dataset SHA256, model SHA256, location, date, run settings. Test invalid/missing data and reject incomparable runs (different dataset/version without disclaimer). No invented performance claims.


Next TODO for Codex: shared input corpus and model-scored holdout results; separate runtime cold-start from network latency; report environment metadata and compare rule-only heuristic and ONNX scores on identical synthetic fixtures; CPU and RSS peaks; compare only when same task/input/version. Never invent benchmark numbers or costs.
