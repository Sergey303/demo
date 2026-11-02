# Demo projects

Independent portfolio demos: two frontend applications, a runnable C#/.NET backend reliability sample, and Python AI/ML engineering projects. Each has its own dependencies and build.

## Start here — strongest engineering evidence

The examples below are intentionally scoped engineering demos, **not production deployments**. Follow the implementation and repeatable tests rather than relying on claims.

| Project | What the source demonstrates | Reproduce / inspect | Evidence and limitations |
| --- | --- | --- | --- |
| **[Audio semantic search + reranking](python-ai/audio-search/README.md)** | Local Whisper speech recognition, ONNX embeddings, exact retrieval, timestamped evidence, optional cross-encoder reranking | [Pipeline](python-ai/audio-search/pipeline.py) · [Retrieval](python-ai/audio-search/search.py) · [Reranking](python-ai/audio-search/rerank.py) · [Holdout experiment](python-ai/audio-search/evaluate_holdout.py) | On 12 **synthetic** holdout questions: top-1 **7/12 → 9/12** with reranking; median query latency **9.9 → 132.6 ms**. Small authored evaluation; not real-world accuracy. |
| **[Reliable Jobs — .NET/PostgreSQL](dotnet-outbox/README.md)** | Atomic outbox, idempotent HTTP submissions, `SKIP LOCKED` worker claims, retries and recovery | [HTTP transaction](dotnet-outbox/src/Program.cs) · [Worker](dotnet-outbox/src/OutboxWorker.cs) · [Database schema](dotnet-outbox/sql/001_init.sql) · [Tests](dotnet-outbox/tests) | Local PostgreSQL integration tests and concurrent HTTP smoke passed; [reproducible load probe](dotnet-outbox/tests/benchmark.py). External side effects are **not** exactly-once. |
| **[Neural retrieval and vector-index trade-offs](python-ai/rag-docs/README.md)** | Batched cosine ranking, lexical baseline, exact vs HNSW and recall/latency measurement | [Index implementation](python-ai/rag-docs/app/core.py) · [HNSW benchmark](python-ai/rag-docs/benchmark_index.py) · [Real document embedding evaluation](python-ai/rag-docs/benchmark_real.py) | Synthetic HNSW experiments quantify speed/recall trade-off; tiny document labels are illustrative, not a general relevance benchmark. |

**Read first:** [`AGENTS.md`](AGENTS.md) gives automated reviewers the code paths, invariants, checks and honest evidence boundaries. Each example is self-contained; model weights, hardware and optional services are described in its own README.

## Other examples

## Bootstrap 5 Dashboard Shell

React, TypeScript, Vite and Bootstrap 5. Responsive dashboard with six routes, workspace switching, editable profile and Playwright tests.

- [Source and detailed instructions](bootstrap5/README.md)
- [Desktop preview](bootstrap5/docs/media/desktop-demo.gif)
- [Mobile preview](bootstrap5/docs/media/mobile-demo.gif)

```bash
cd bootstrap5
npm ci
npm run dev
```

## GosVet

Veterinary-clinic demo, React and PrimeReact, with single-file build. Copied from the original [GosVet](https://github.com/Sergey303/GosVet) repository into [GosVet/](GosVet/) as regular versioned files. This directory is **not** a Git submodule.

```bash
cd GosVet
npm ci
npm run dev
npm run build
```

See [GosVet/README.md](GosVet/README.md) for application routes and its portable `dist/index.html` build.

## Reliable Jobs — .NET 10, ASP.NET Core, PostgreSQL

A small original backend demo of transactional outbox, idempotency keys, concurrent workers via PostgreSQL `SKIP LOCKED`, and bounded retry. Standalone, no code from past employers. Includes unit tests. **Database integration requires a running local PostgreSQL instance.**

- [Source, runbook and failure guarantees](dotnet-outbox/README.md)
- [HTTP endpoint and transaction](dotnet-outbox/src/Program.cs)
- [Outbox worker](dotnet-outbox/src/OutboxWorker.cs)
- [Schema and indexes](dotnet-outbox/sql/001_init.sql)

```bash
cd dotnet-outbox
dotnet test tests/ReliableJobs.Tests.csproj
# See dotnet-outbox/README.md for Docker/PostgreSQL execution.
```

## Python AI / Neural Networks

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
  python-ai/     # Neural RAG, PyTorch classification and tool agent
  README.md
```

All projects are standalone. Run npm commands in the corresponding project directory rather than the repository root. The original GosVet repository is kept unchanged. Note that all committed files under `demo/GosVet/` are public because this repository is public.
