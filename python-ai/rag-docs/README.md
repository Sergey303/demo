# Neural RAG: knowledge-base question answering

A **real neural embedding model** indexes local Markdown/text documents, ranks passages by cosine similarity and returns source attribution. Optional local Ollama generates a grounded answer. **The HTTP `/ask` route is now fail-closed:** a signed user identity and current per-source tenant ACL are required before retrieval or generation.

## Run

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export DEMO_AUTH_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export DOCS_DIR="$PWD/documents"
export DOCS_ACL_FILE="$PWD/access-policy.example.json"
export DEMO_AUTH_TOKEN="$(PYTHONPATH=../../architecture python -c 'from audio_access import issue_token; print(issue_token("example-team","alice"))')"
uvicorn app.main:app --port 8000 &
curl -s localhost:8000/ask -H 'content-type: application/json' \
  -H "Authorization: Bearer $DEMO_AUTH_TOKEN" -d '{"question":"How do I get a refund?"}'
pytest -q
```

First execution downloads a multilingual sentence-transformer model; subsequent starts use its local cache. Configure `DOCS_DIR` to index your own .md/.txt files; restart server to reindex. To generate an answer, start local Ollama with `llama3.2` (or set `OLLAMA_MODEL`), then send `{"question":"...","generate":true}`.

**Access-control contract:** the signed user identity is verified by the shared monorepo `architecture/audio_access.py` module; access policy is an operator-controlled JSON manifest (see `access-policy.example.json`) that maps each source path to a tenant and readers. The manifest is **re-read on every request**: changing a grant takes effect on the next retrieval without rebuilding embeddings or restarting FastAPI. Document paths are tenant-relative (e.g., `team-a/faq.md`), and unauthorized sources are excluded **before cosine ranking** and before any context is sent to Ollama. Missing/corrupt policy fails closed (503). No matching grants return no evidence. Do not send real private documents through this example without production IAM and storage controls.

**Engineering trade-offs:** in-memory exact vector search is deliberate for a small demo; use a vector index and incremental reindexing at scale. The embedding index contains all locally indexed documents and is trusted server-side memory, *not* tenant-isolated storage. Retrieved documents are untrusted; no prompt can guarantee absence of prompt injection. Citations are passage references, not verification of generated claims. Production needs database-backed authorization/RLS, audited grant changes, OIDC, PII handling, retrieval/answer evaluation, tracing, rate limits, latency/cost dashboards, and tests against revocation during in-flight requests.

**Interview demo:** compare top-k hits and scores; explain chunk size, vector similarity, offline local inference, when RAG is preferable to model fine-tuning, and why tests inject a fake encoder to avoid network/model downloads.

## Grounded evidence mode and quality gates

[Quality and abstention report](QUALITY-EVAL.md) demonstrates a conservative
source-quote response (set `answer_mode: "evidence"` on authenticated `/ask`),
server-owned similarity threshold, explicit citations/refusals, and a small
hand-authored evaluation covering answerable, unanswerable and tenant-restricted
questions. This is **extractive evidence**, not an independently verified
free-form answer. The measured local model has known false answers; the
[executable gate](quality_eval.py) returns `NOT_ELIGIBLE` rather than
presenting the synthetic corpus as proof of production quality.

## Evidence-oriented retrieval comparison

`python evaluate.py` compares real sentence-transformer ranking against an inspectable TF-IDF cosine baseline on the same small, separated evaluation corpus. It reports **Recall@1**, **MRR@1**, and per-question disagreements. A one-document or Recall@3-on-three-documents evaluation cannot meaningfully distinguish rankers; this evaluation avoids that particular false positive. The included corpus is still illustrative; a representative blind dataset is required before claiming model superiority.

## Exact retrieval implementation

`app/core.py` constructs the index in bounded encoding batches, normalizes each stored vector once, and uses a bounded heap for exact top-k (rather than sorting every document). Query ranking costs **O(N × d + N log k)**, index storage **O(N × d)**, where N is passage count and d is embedding width. It deterministically resolves tied scores using document order and rejects malformed, zero-norm and overflowed embeddings (for both index and query). This is deliberately **exact search**, suitable as a correctness reference for future approximate nearest-neighbor indexes; it is not an ANN or distributed search service.

## Reproducible vector-index benchmark

Install `pip install -r requirements-benchmark.txt`, then run `OPENBLAS_NUM_THREADS=1 python benchmark_index.py --n 10000 --queries 300 --k 10 --ef 64`. This compares exact NumPy cosine dot-product (including partial top-k selection) and `hnswlib` cosine search on **identical seeded random unit vectors**. It reports HNSW recall@10 versus exact neighbors, p50/p95/p99 search latency and HNSW index construction time; these numbers exclude neural model inference and do not represent relevance to human queries.

Example measurements in RDC (single HNSW query/build thread; 128 dimensions, 300 queries; individual non-warmed/OS noisy runs):

| N | ef_search | HNSW recall@10 | Exact p50 | HNSW p50 | HNSW build |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 10,000 | 64 | 0.6287 | 0.149 ms | 0.087 ms | 1.623 s |
| 10,000 | 256 | 0.9543 | 0.200 ms | 0.284 ms | 1.637 s |
| 50,000 | 256 | 0.7063 | 1.231 ms | 0.509 ms | 16.284 s |

**Trade-off:** at 10k vectors, tighter recall made HNSW slower than exact search in this run; at 50k vectors, HNSW was faster but sacrificed substantial recall. Results can vary by CPU, BLAS, build parameters and corpus distribution. `input_vector_bytes` is a storage lower bound for the float32 array, **not** peak RSS or HNSW memory use. The benchmark must not be presented as proof that approximate retrieval improves RAG answer quality.

### Actual neural-document index experiment

`OPENBLAS_NUM_THREADS=1 python benchmark_real.py --k 1 --ef 32` embeds the **real text passages** in `eval/corpus` with the CPU ONNX model `BAAI/bge-small-en-v1.5`, then compares exact cosine ranking with HNSW on exactly the same embeddings. It separately reports **ANN recall against exact neighbors** and **source relevance against manually labeled questions**. Model inference is excluded from per-search timings; the small corpus is illustrative, **not** a representative benchmark or evidence of scalable ANN performance. Model weights download on first execution. The older `benchmark_index.py` remains a distinct synthetic scalability microbenchmark.

### Token-budgeted chunking (tiktoken)

`app/token_chunks.py` provides an alternative tokenizer-aware document splitter with configurable token budget and overlap (`pip install tiktoken`). Chunks retain source attribution; token boundaries are based on `cl100k_base`, **not** the embedding model's tokenizer. For Unicode, decoding arbitrary BPE windows may split UTF-8 boundaries, so this is a demonstrator rather than a lossless byte-preserving tokenizer-aware splitter.

For sealed independent human annotation and offline free-form answer review,
see [BLIND-EVAL.md](BLIND-EVAL.md). No independent labels or live generated
benchmark results are supplied.

**Raw local generation recording:** [sealed holdout recorder and human review protocol](BLIND-EVAL.md) uses `capture_local.py` with loopback-only Ollama and stores frozen model/prompt/corpus metadata without fabricating grounding labels. A real local Ollama/Qwen3 1.7B capture of one synthetic case passed on RDC (2026-11-07); no independently reviewed LLM quality metrics are claimed.

**SYNTHETIC NON-INDEPENDENT recorder exercise:** `eval/synthetic_capture/`
contains 11 invented questions with frozen tenant-authorized evidence: six
answerable, two related but insufficient, and three empty. All annotations are
UNREVIEWED; independent/blind/adjudicated are false. `holdout` solely exercises
the recorder and never claims independent evaluation. Seals prove neither
independent review nor answer quality. Rebuild with
`python eval/synthetic_capture/build.py`; its prior-exposure copy matches
`eval/prior_exposure.json`, and duplicate/exposed questions are rejected.
From `python-ai/rag-docs`, with `qwen3:1.7b` already installed locally:

```bash
python capture_local.py --dataset eval/synthetic_capture/dataset.json \
  --manifest eval/synthetic_capture/manifest.json \
  --prior eval/synthetic_capture/prior_exposure.json \
  --model qwen3:1.7b --endpoint http://127.0.0.1:11434 \
  --allow-unsealing-holdout --output /tmp/rag-synthetic-qwen3-capture.json
```

The access flag is for this explicitly exposed synthetic fixture only; never
unseal an independent holdout for this developer exercise. Use a fresh output
path under `/tmp`. No model is downloaded. Empty evidence skips generation;
related insufficient evidence exercises model abstention. Raw captures provide
no verified quality labels; the frozen 28-case threshold remains unchanged.

**Qwen3 evaluation, actual local runs:** [synthetic no-thinking comparison](SYNTHETIC-QWEN3-CAPTURE.md) and [mechanical raw-capture diagnostics](capture_diagnostics.py). The 11-case fixture is deliberately developer-authored and does not constitute independent validation of answer faithfulness.

### Opt-in guarded free-form answers

Send `{"question":"…","answer_mode":"guarded","generate":true}` to the
same authenticated `/ask` endpoint. Signed identity and the current ACL still
filter retrieval before generation; clients cannot supply a tenant, source list,
or score threshold. Existing retrieval, evidence and legacy `generate=true`
behavior remain unchanged.

Guarded mode abstains before contacting Ollama when authorized evidence is absent
or the top cosine is below the unchanged `DEFAULT_MIN_SCORE` (0.67). This is a
**relevance threshold, not entailment**. Generation uses only a local HTTP Ollama
endpoint, with redirects and environment proxies disabled, `think=false`,
`stream=false`, `format="json"`, temperature 0 and `num_predict=256`. No model is
downloaded by this mode. The system prompt includes only authorized retrieved
excerpts, identifies sources by exact relative filenames, and treats excerpts as
untrusted data. These prompt-injection precautions are best effort.

The mechanical gate requires completed output (`done=true`, `done_reason="stop"`
or absent) and strict JSON with exactly `answer`, `citations`, and `abstain`.
It rejects duplicate keys, extra fields, wrong types, answers over 4,000 characters,
raw output over 16,384 characters, HTTP response envelope over 128 KiB
(**bounded during streaming, before JSON parsing**), invalid UTF-8 including escaped
lone surrogate characters, empty substantive answers, missing/duplicate/
unknown citations, and citations on abstention. Every accepted citation must be
an authorized retrieved source ID. This validates citation syntax and authorization;
it does **not** establish semantic faithfulness, entailment, or absence of
hallucination. A model can still invent a claim and cite an allowed document.

Guarded responses always contain `answer`, `sources` (empty), `mode="guarded"`,
`abstained`, `citations`, and `reason`. Accepted answers carry the reason
`citation syntax/authorization validated, semantic faithfulness unverified`.
Abstentions use `ABSTAIN: Insufficient authorized evidence to answer.`, empty
citations, and a reason of `no_authorized_sources`, `below_relevance_threshold`,
`model_abstained`, or `invalid_model_output`. Invalid or truncated output is never
returned as an answer; model refusal prose and source excerpts are also withheld.
Transport failures return a fixed 503 error without private model/error content.

**Verification (2026-11-07):** 145/145 RAG tests passed, including oversized
HTTP envelopes and malformed Unicode, with one existing TestClient dependency
warning. A separate local CPU Qwen3 1.7B FastAPI smoke used an authenticated
synthetic tenant with one authorized policy excerpt: the supported question
returned `Tuesday`, citation `policy.md`, and `abstained=false`; a question
about an unmentioned fee returned `abstained=true`, reason
`invalid_model_output`. Both used HTTP 200 and real local model generation.
The latter is a safe rejection of a malformed model result, **not** evidence
that the model itself chose a meaningful abstention. These two developer-authored
smoke cases are NOT an independent quality study. Semantic support, prompt
injection resilience and free-form factual accuracy remain unverified.
Evaluation fixtures, prior quality benchmarks and the 0.67 gate are unchanged.
