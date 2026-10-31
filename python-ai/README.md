# Python AI engineering portfolio

Two isolated, runnable demos built around **actual neural networks**.

| Project | Skills shown | API |
| --- | --- | --- |
| [Neural RAG](rag-docs/) | Sentence Transformers, multilingual embeddings, semantic search, source attribution, optional local Ollama | `POST /ask` |
| [Constrained tool-agent](tool-agent/) | Allowlisted tools, human approval, controlled writes, FastAPI; deterministic foundation, not yet an LLM planner | `POST /execute` |
| [Ticket classification](ticket-classifier/) | PyTorch, supervised neural training, checkpointing, evaluation, classification, FastAPI inference | `POST /predict` |

Each project has its own installation, runbook and unit tests. Models are downloaded/trained locally, never committed. These are demonstrations, **not commercial production models**.

## Next portfolio improvements

1. Add real anonymized or public representative evaluation datasets, precision@k / recall@k for RAG, macro-F1 / calibration for classifier, reproducible experiment reports.
2. Add a constrained tool-calling agent with approval gates and trace-based evaluations.
3. Add image defect detection using a pretrained vision backbone and transfer learning.
4. Add Docker, CI, structured telemetry, monitoring, versioned model release and safe rollback.

Do not claim professional ML experience or production-grade accuracy based solely on demo code.
