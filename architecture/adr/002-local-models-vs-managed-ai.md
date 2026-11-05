# ADR-002 — Local-first transcription/embeddings; managed API as an evaluated alternative

**Status:** Accepted for standalone audio-search demo; conditional target-system policy.

**Context.** Internal meetings and documents may contain confidential information. Uploading them to third parties can violate data-handling constraints. AI inference also has cold-start, memory, model-quality and throughput costs.

**Alternatives.** (A) Local faster-whisper (CPU int8), local ONNX embeddings/cross-encoder; inspectable data flow and no third-party inference endpoint. (B) Managed ASR/embedding/LLM APIs; less local resource management, but sensitive-data transfer, residency, request charges and vendor dependence. (C) Hybrid routing by classification and budget, but only after trusted policy classification exists.

**Decision.** For the public example use A. The [audio pipeline](../../python-ai/audio-search/pipeline.py) decodes with FFmpeg then calls local Whisper weights, [search](../../python-ai/audio-search/search.py) uses local vectors, [rerank](../../python-ai/audio-search/rerank.py) offers a local cross-encoder. The [document RAG](../../python-ai/rag-docs/app/main.py) can call **local Ollama**; this is a separate demo, not integrated with audio ingestion.

**Evidence and limitations.** Audio has real CPU model execution, six generated recordings and a new 12-question synthetic holdout, **not** independent human speech. Cache reuse is covered by [unit tests](../../python-ai/audio-search/tests/test_pipeline.py). No data-classification service, IAM, controlled document ingestion, audio PII redaction, tenancy or GPU deployment is demonstrated.

**Architectural gate before deployment.** Classify/authorize data *before* storage and model inference. Evaluate WER/CER on consented diverse audio; recall/grounding and abstention on blind queries; CPU/GPU p50/p95 per minute of audio; RAM, model startup, throughput and total cost per 1000 processed minutes. Include retention/deletion, model provenance/licensing and offline cache governance. Move to managed APIs only when legal/data-residency approval, end-to-end quality and measured TCO justify the trust boundary.

**Revisit when:** inference throughput violates ingestion backlog SLO; domain-specific ASR quality is poor; high GPU idle cost dominates; multilingual/diarization capabilities become mandatory; or a compliant managed provider demonstrably improves overall cost and quality.
