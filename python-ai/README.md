# Python AI engineering portfolio

Independent, deliberately scoped demonstrations of neural retrieval, model training and constrained tool execution. Some ordinary product/infrastructure glue is intentionally omitted so reviewers can inspect the central mechanism; omissions are not production guarantees.

| Project | Skills shown | API |
| --- | --- | --- |
| [Audio Search](audio-search/) | Whisper, ONNX embeddings, cross-encoder reranking, reproducible holdout evaluation; timestamped retrieval, not proof of real-world precision | CLI |
| [Neural RAG](rag-docs/) | Sentence Transformers, multilingual embeddings, semantic search, source attribution, optional local Ollama | `POST /ask` |
| [Constrained tool-agent](tool-agent/) | Allowlisted tools, human approval, controlled writes, FastAPI; deterministic foundation, not yet an LLM planner | `POST /execute` |
| [Ticket classification](ticket-classifier/) | PyTorch, supervised neural training, checkpointing, evaluation, classification, FastAPI inference | `POST /predict` |

Each project has its own installation, runbook and unit tests. Models are downloaded/trained locally, never committed. These are demonstrations, **not commercial production models**.

## What is demonstrated (and what is not)

- **Audio Search**: CPU local recognition and reranking; independently authored synthetic queries only, not representative speech evaluation.
- **RAG**: neural embeddings and exact cosine ranking; the optional Ollama answer path depends on a locally installed model. Included evaluation data is illustrative, not a real-world benchmark.
- **Classifier**: an actual PyTorch train/infer code path. The small synthetic data does not support real-world accuracy claims.
- **Tool agent**: a constrained tool execution boundary, **not** an LLM planner or authenticated approval service.

Each subproject has specific run and test instructions. Review implementations and tests directly; a passing unit test does not establish scalability or production readiness.

## Validation and packaging

Dockerfiles provide reproducible build entry points, but image builds and all model-backed paths have not been verified in every environment. GitHub Actions has not been enabled: repository push credentials do not currently permit publishing workflow files. Tests can be run from each subproject with `python -m pytest -q tests` after installing its requirements.

**Retrieval access controls:** the audio evidence API uses current PostgreSQL grants, while standalone document RAG reloads an operator-managed per-source ACL file for each request. Both validate signed principal claims. These are narrow demos, not production OIDC/RLS implementations.
