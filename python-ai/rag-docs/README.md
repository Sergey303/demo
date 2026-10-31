# Neural RAG: knowledge-base question answering

A **real neural embedding model** indexes local Markdown/text documents, ranks passages by cosine similarity and returns source attribution. Optional local Ollama generates a grounded answer. No credentials are required.

## Run

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
curl -s localhost:8000/ask -H 'content-type: application/json' -d '{"question":"How do I get a refund?"}'
pytest -q
```

First execution downloads a multilingual sentence-transformer model; subsequent starts use its local cache. Configure `DOCS_DIR` to index your own .md/.txt files; restart server to reindex. To generate an answer, start local Ollama with `llama3.2` (or set `OLLAMA_MODEL`), then send `{"question":"...","generate":true}`.

**Engineering trade-offs:** in-memory exact vector search is deliberate for a small demo; use a vector index and incremental reindexing at scale. Retrieved documents are untrusted; no prompt can guarantee absence of prompt injection. Citations are passage references, not verification of generated claims. Production would need access-control filtering, PII handling, retrieval/answer evaluation, tracing, rate limits, latency/cost dashboards and security tests.

**Interview demo:** compare top-k hits and scores; explain chunk size, vector similarity, offline local inference, when RAG is preferable to model fine-tuning, and why tests inject a fake encoder to avoid network/model downloads.

## Evidence-oriented retrieval comparison

`python evaluate.py` compares real sentence-transformer ranking against an inspectable TF-IDF cosine baseline on the same small, separated evaluation corpus. It reports **Recall@1**, **MRR@1**, and per-question disagreements. A one-document or Recall@3-on-three-documents evaluation cannot meaningfully distinguish rankers; this evaluation avoids that particular false positive. The included corpus is still illustrative; a representative blind dataset is required before claiming model superiority.
