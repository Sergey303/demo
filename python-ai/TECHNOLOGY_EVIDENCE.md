# Technology evidence map — current truth

This is a guide for a technical reviewer, **not** a list of achieved production competencies. Claims are intentionally narrower than project titles.

| Demonstration | Mechanism / source of truth | Evidence available now | Important missing proof |
| --- | --- | --- | --- |
| Semantic retrieval | `rag-docs/app/core.py`: chunking, encoder injection, cosine ranking; `rag-docs/app/main.py`: SentenceTransformer integration | deterministic core tests with fake vectors; simple smoke run | model-backed retrieval metrics on independent representative corpus; negative/no-answer queries; access control |
| RAG answer generation | `rag-docs/app/main.py`: optional local Ollama; `build_prompt()` | code path exists | factual grounding/citation correctness, injection-resistance experiments, LLM evaluation |
| Neural classification | `ticket-classifier/app/model.py`: token hash → embedding → pooled representation → MLP; `train.py`: cross entropy + AdamW | architecture, training script, synthetic dataset and metric helpers | completed training run, independent test corpus, calibrated probabilities, non-neural TF-IDF baseline, macro-F1 |
| Tool boundary | `tool-agent/app/agent.py`: allowlist, argument checks, controlled file operations | local 4-test agent suite passed previously; smoke on approval-required branch | authenticated server-side approval, symlink/race defense, audit trail, LLM planner with adversarial prompt evaluation |
| Delivery | Dockerfiles and local runbooks | source files exist, Python compilation succeeded | image builds, full CI (workflow local-only due token permission), repeatability across environments |

## One question that matters most per demo

**RAG:** Does the actual neural embedder outperform a lexical search baseline on a blind set of meaningful questions, including cases where no evidence exists? A retrieval hit for a corpus containing only one document is not a useful quality demonstration. Report Recall@k and MRR on *multiple* documents, separately measure unanswered queries and citation correctness; show failure examples.

**Classifier:** Does a trained model beat TF-IDF + linear classifier on a held-out, independently sourced dataset without duplicative template phrases leaking into test? Compare macro-F1 and per-class confusion; report sample counts, label quality, and where the neural model is worse. Current tiny toy data cannot establish this.

**Agent:** Can the model propose permitted tool calls while an independently enforced execution boundary blocks unauthorized writes? Client-controlled `approved=true` is only a demo flag. Distinguish model planning accuracy, tool-execution correctness and authorization safety. Never execute adversarial model output directly.

## Reviewer evidence template

- **Claim:** measurable, falsifiable sentence.
- **Code pointers:** function and path; explain tensors/data flow or boundary.
- **Baseline:** simpler competing solution.
- **Evidence:** command, dataset revision, split method, observed numbers (if actually run).
- **Disconfirming cases:** bad data, leakage, prompt injection, scaling, auth, language shift.
- **Confidence:** one of the statuses from `AGENTS.md`.
- **Next experiment:** the one cheapest discriminating test, not a general wishlist.

## High-value next actions

1. RAG: replace trivial evaluation with a multi-document labeled corpus; compare embedding retrieval against a deterministic lexical baseline on the **same** queries and inspect failures.
2. Classifier: curate a defensible public split and compare against TF-IDF + linear classifier; measure macro-F1/confusion and document leakage checks.
3. Agent: enforce approval on the server, then add an LLM planner and evaluate safe/unsafe tool calls separately.

A public dataset must be accompanied by its provenance, license, selection rules and any PII redaction; never invent a dataset or numerical improvement.
