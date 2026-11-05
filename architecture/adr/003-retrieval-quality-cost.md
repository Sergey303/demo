# ADR-003 — Exact retrieval baseline, conditional ANN, evidence-gated cross-encoder

**Status:** Exact retrieval implemented; ANN and reranking evaluated as opt-in alternatives, not enabled by default.

**Context.** Enterprise search needs traceable results under a latency budget. ANN can reduce vector search time but sacrifices recall and requires index maintenance. A cross-encoder may improve top-1 rank but consumes additional CPU/GPU inference.

**Alternatives.** (A) Exact normalized cosine, bounded top-k heap: deterministic baseline, O(Nd + N log k). (B) HNSW ANN: potentially faster as N grows, with approximate neighbors and build/update overhead. (C) Exact dense retrieval + cross-encoder rerank of shortlist: improved contextual ranking but slower queries. (D) BM25/RRF hybrid: inexpensive lexical support, but no measured benefit in this corpus.

**Decision.** Keep A as the demonstrator's default, with C opt-in for clearly justified workloads. Do **not** assert that ANN or hybrid improves real answer quality from vector-similarity microbenchmarks. Source-level and passage-level metrics must be separated. Tenant ACL filtering must occur before any source or passage can be returned or used for generation (not implemented in demo).

**Measured trade-off.** [Audio holdout](../../python-ai/audio-search/evaluate_holdout.py), six synthetic audios and 12 labeled queries: Recall@1 **7/12 exact vs 9/12 reranked**, median query latency **9.912 vs 132.612 ms** (one CPU environment), Recall@3 12/12 in both. This dataset is too small to assert statistical dominance. [HNSW benchmark](../../python-ai/rag-docs/benchmark_index.py) found 10k vectors at ef=256: recall@10 0.9543 and 0.284 ms p50 HNSW, versus 0.200 ms p50 exact; at 50k ef=256: 0.7063 recall@10 and 0.509 ms HNSW p50 versus 1.231 ms exact. These are synthetic vector microbenchmarks, *not* relevance results.

**Executable fitness function.** [`architecture/decision_gate.py`](../decision_gate.py) validates paired questions and recomputes top-1, counts corrected and regressed queries, refuses rollout inference below an explicit sample-size floor (default 100), and checks an explicit median-latency threshold. It reports `ELIGIBLE_FOR_FURTHER_REVIEW`, **not** automatic deploy approval; p95/p99, answer groundedness, confidence calibration and access-control tests remain necessary.

**Revisit when:** corpus and QPS exceed exact search's measured cost, performance budgets change, reranking's paired benefit is demonstrated on blind representative queries, or ingestion and deletion/ACL updates make an ANN index operationally justified. Re-run the same evaluation and record regression counts, latency distribution, index update cost and invalidation behavior.
