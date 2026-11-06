# Engineering portfolio: .NET reliability, RAG/retrieval and full-stack demos

**For .NET / Tech Lead hiring:** start with [Reliable Jobs](dotnet-outbox/README.md) — an ASP.NET Core and PostgreSQL example of transactional outbox, HTTP idempotency, concurrent worker claims, retries and recovery. [Inspect the API transaction](dotnet-outbox/src/Program.cs), [worker](dotnet-outbox/src/OutboxWorker.cs), and [tests](dotnet-outbox/tests).

**For AI / RAG hiring:** start with [audio search + reranking](python-ai/audio-search/README.md) and [retrieval benchmarks](python-ai/rag-docs/README.md). Code and reproducible small-sample evaluations are linked below.

**For full-stack / product hiring:** explore the [React dashboard](bootstrap5/README.md) and [GosVet veterinary-clinic prototype](GosVet/README.md).

These are **independent, original engineering examples, not claims of commercial production deployments**. Each has its own dependencies and runbook. Commercial X5 and CASESTUDIO achievements are described in the resume rather than inferred from this code.

## Strongest code evidence

Follow the implementation and repeatable checks rather than relying on claims.

| Project | What the source demonstrates | Reproduce / inspect | Evidence and limitations |
| --- | --- | --- | --- |
| **[Reliable Jobs — .NET/PostgreSQL](dotnet-outbox/README.md)** | Atomic outbox, idempotent HTTP submissions, `SKIP LOCKED` worker claims, retries and recovery | [HTTP transaction](dotnet-outbox/src/Program.cs) · [Worker](dotnet-outbox/src/OutboxWorker.cs) · [Database schema](dotnet-outbox/sql/001_init.sql) · [Tests](dotnet-outbox/tests) | Local PostgreSQL integration tests and concurrent HTTP smoke passed; [reproducible load probe](dotnet-outbox/tests/benchmark.py). External side effects are **not** exactly-once. |
| **[Audio semantic search + reranking](python-ai/audio-search/README.md)** | Local Whisper speech recognition, ONNX embeddings, exact retrieval, timestamped evidence, optional cross-encoder reranking | [Pipeline](python-ai/audio-search/pipeline.py) · [Retrieval](python-ai/audio-search/search.py) · [Reranking](python-ai/audio-search/rerank.py) · [Holdout experiment](python-ai/audio-search/evaluate_holdout.py) | On 12 **synthetic** holdout questions: top-1 **7/12 → 9/12** with reranking; median query latency **9.9 → 132.6 ms**. Small authored evaluation; not real-world accuracy. |
| **[Neural retrieval and vector-index trade-offs](python-ai/rag-docs/README.md)** | Batched cosine ranking, lexical baseline, exact vs HNSW and recall/latency measurement | [Index implementation](python-ai/rag-docs/app/core.py) · [HNSW benchmark](python-ai/rag-docs/benchmark_index.py) · [Real document embedding evaluation](python-ai/rag-docs/benchmark_real.py) | Synthetic HNSW experiments quantify speed/recall trade-off; tiny document labels are illustrative, not a general relevance benchmark. |

**Architecture case (System / AI Architect):** [Enterprise Knowledge & Meeting Evidence Platform](architecture/README.md) — C4 target architecture, 3 evidence-backed ADRs, failure/trust matrix, [cross-project audio→Outbox→search orchestration](architecture/evidence_flow.py) (ASR pre-acceptance), and an [executable retrieval quality/latency gate](architecture/decision_gate.py). Implemented components and unbuilt integrations are clearly separated.

**Read first:** [`AGENTS.md`](AGENTS.md) gives automated reviewers the code paths, invariants, checks and honest evidence boundaries. Each example is self-contained; model weights, hardware and optional services are described in its own README.

## Frontend examples

### Bootstrap 5 Dashboard Shell

React, TypeScript, Vite and Bootstrap 5. Responsive dashboard with six routes, workspace switching, editable profile and Playwright tests.

- [Source and detailed instructions](bootstrap5/README.md)
- [Desktop preview](bootstrap5/docs/media/desktop-demo.gif)
- [Mobile preview](bootstrap5/docs/media/mobile-demo.gif)

```bash
cd bootstrap5
npm ci
npm run dev
```

### GosVet

Veterinary-clinic demo, React and PrimeReact, with single-file build. Copied from the original [GosVet](https://github.com/Sergey303/GosVet) repository into [GosVet/](GosVet/) as regular versioned files. This directory is **not** a Git submodule.

```bash
cd GosVet
npm ci
npm run dev
npm run build
```

See [GosVet/README.md](GosVet/README.md) for application routes and its portable `dist/index.html` build.

## Additional Python AI examples

- [Neural RAG document assistant](python-ai/rag-docs/README.md): multilingual neural embeddings, semantic search, source references and optional local Ollama generation.
- [PyTorch ticket classifier](python-ai/ticket-classifier/README.md): train an embedding + MLP neural network, evaluate on held-out toy samples and serve inference through FastAPI.

- [Safe tool-calling agent](python-ai/tool-agent/README.md): restricted tools, validation and approval gate (deterministic groundwork for an LLM planner).

See [Python AI portfolio overview](python-ai/README.md). Python dependencies and tests are isolated per example.

## Layout

```text
demo/
  bootstrap5/     # Bootstrap 5 dashboard
  GosVet/         # Veterinary clinic application
  dotnet-outbox/  # ASP.NET Core, PostgreSQL and tests
  python-ai/     # Audio search, Neural RAG, classification and tool agent
  README.md
```

All projects are standalone. Run npm commands in the corresponding project directory rather than the repository root. The original GosVet repository is kept unchanged. Note that all committed files under `demo/GosVet/` are public because this repository is public.
