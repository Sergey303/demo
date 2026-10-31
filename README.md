# Demo projects

Independent portfolio demos: two frontend applications, a runnable C#/.NET backend reliability sample, and two Python neural-network projects. Each has its own dependencies and build.

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

See [Python AI portfolio overview](python-ai/README.md). Python dependencies and tests are isolated per example.

## Layout

```text
demo/
  bootstrap5/     # Bootstrap 5 dashboard
  GosVet/         # Veterinary clinic application
  dotnet-outbox/  # ASP.NET Core, PostgreSQL and tests
  python-ai/     # Neural RAG and PyTorch classification
  README.md
```

All projects are standalone. Run npm commands in the corresponding project directory rather than the repository root. The original GosVet repository is kept unchanged. Note that all committed files under `demo/GosVet/` are public because this repository is public.
