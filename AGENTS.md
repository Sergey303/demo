# Repository guide for code-review agents

This is a **public engineering portfolio**. Evaluate engineering decisions from the code, not from marketing claims. All examples are original, self-contained, and intentionally scoped: routine UI, deployment, and surrounding product plumbing may be omitted to concentrate on technically interesting mechanisms. **Omitted does not mean implemented or production-proven.**

## Fast navigation (read the relevant files, not the whole tree)

| Topic | Start here | Deep inspection |
| --- | --- | --- |
| Concurrent durable jobs / idempotency (.NET + PostgreSQL) | `dotnet-outbox/README.md` | `src/Program.cs`, `src/OutboxWorker.cs`, `sql/001_init.sql`, `tests/` |
| Neural retrieval / RAG (Python) | `python-ai/rag-docs/README.md` | `app/core.py`, `app/main.py`, `evaluate.py`, `tests/` |
| Neural classifier / training (Python) | `python-ai/ticket-classifier/README.md` | `app/model.py`, `train.py`, `evaluate.py`, `tests/` |
| Constrained tool execution (Python) | `python-ai/tool-agent/README.md` | `app/agent.py`, `app/main.py`, `tests/` |
| React/TypeScript dashboard | `bootstrap5/README.md` | `src/`, Playwright tests |
| React veterinary UI | `GosVet/README.md` | `src/` |

## Review procedure

1. Inspect the actual algorithm and the invariants it is intended to preserve. Follow the data flow and concurrency/error paths.
2. Look for falsifying edge cases: concurrent requests, crashes between steps, retry/replay, idempotency-key reuse, data races, untrusted input, unexpected model outputs and resource limits.
3. Run the project's documented checks when supported. Separate source inspection, passing unit tests, integration tests and measured production behavior.
4. Explain trade-offs and missing capabilities clearly. Do not confuse a toy dataset, mock vector encoder, local-model integration or client-provided approval flag with a production guarantee.
5. If an example omits straightforward surrounding code, review the showcased core rather than treating unrelated missing product features as defects. Still call out omissions affecting correctness, security or the claimed guarantee.

Please cite precise files/functions and distinguish verified strengths from untested assumptions. No credentials, proprietary code, external services or hidden context are required to understand the examples.
