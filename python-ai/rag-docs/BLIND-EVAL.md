# Blind human review and recorded generation

Current status: **INSUFFICIENT INDEPENDENT EVIDENCE**. No independent labels or
live generated-answer measurements are supplied. `eval/blind_development.json`
is one synthetic, UNREVIEWED contract fixture, including a holdout-marked case
solely to exercise sealing. It is not a benchmark. Existing `evaluate.py`,
`quality_eval.py`, and the observed 28 cases remain unchanged. Do not tune the
existing 0.67 threshold on those observations or the new holdout.

## Collect and freeze evidence before inference

1. Have a custodian recruit domain reviewers independent of implementation and
   obtain consent/provenance for representative, non-production questions.
   Collect **100+ new holdout questions**, with at least 30 answerable and 30
   requiring abstention, plus separate train/dev material. Include inaccessible,
   revoked, conflicting, multilingual and deceptively similar evidence. Do not
   pad, paraphrase or relabel the existing 28 as independent data.
2. Before seeing retrieval or answers, two reviewers independently annotate
   answerability, expected abstention, permitted tenant sources and exact evidence
   spans against a versioned corpus/permission snapshot. Record reviewer identity,
   collection provenance and blind status. Retain both original annotations in
   the custodian's audit archive; resolve disagreements with an adjudicator and
   set `adjudicated` only after resolution. A flag is a process assertion, not
   verification of human identity. Record unsupported/conflicting questions as
   abstentions according to a written rubric agreed before collection.
3. Use the strict fixture as the JSON template. All fields are mandatory; booleans
   must be JSON booleans. IDs use letters, digits, underscore, dot and hyphen.
   `permissions` is the tenant snapshot; `evidence` contains only authorized source
   objects (`id`, `tenant`, `version`, `text`). `allowed_source_ids` identifies
   acceptable answer sources within that evidence. Spans use Python Unicode
   character offsets `[start,end)` and an exact `quote`. Answerable labels need
   spans. Unanswerable cases may have no spans. Use `UNREVIEWED` and false review
   flags until actual review occurs. The evaluator rejects missing labels.
4. Custodian assigns splits **before inference**, keeps holdout questions/labels
   unavailable to implementers and seals the complete dataset. Freeze model,
   corpus, policy and annotation protocol first. Seal hashes commit content and
   split membership; a hash is not encryption, signature or access control. Store
   the manifest in a separately controlled immutable archive; do not regenerate
   it after looking at results. Include every previously exposed question in the
   prior-exposure list (the provided list includes the prior 28). Exact normalized
   duplicates are rejected across splits and against exposed holdout questions.
   A human must additionally screen semantic paraphrases, shared origins and
   near-duplicates: hashes cannot establish independence or prevent deliberate
   resealing. Evaluate once; subsequent changes require a fresh blind holdout.

From `python-ai/rag-docs` (no model, network or server required):

```bash
/workspace/.demo-bench-venv/bin/python blind_eval.py seal \
  --dataset eval/blind_development.json --prior eval/prior_exposure.json \
  --manifest /tmp/rag-sealed-manifest.json
```

`seal` exclusively creates a new manifest and refuses to overwrite one. The
checked-in development manifest demonstrates the format. The custodian should
keep real holdout files and reports out of the public repository.

## Offline free-form evaluation contract

Capture outputs from a separately operated local generator only when available;
this evaluator never invokes Ollama, downloads a model or calls a hosted service.
Supply a JSON list of records with exactly these fields:

```json
{
  "id": "synthetic-dev-1",
  "case_sha256": "SHA256_OF_COMPLETE_FROZEN_CASE",
  "tenant": "demo",
  "answer": "Refunds take 7 days. [[refund]]",
  "abstained": false,
  "citations": ["refund"],
  "evidence": [{"id":"refund","tenant":"demo","version":"synthetic-v1","text":"Refunds take 7 days."}],
  "claims": [{"start":0,"end":30,"citations":["refund"]}],
  "run": {"model":"local model/version or artifact hash", "corpus_sha256":"SHA256_OF_CASE_EVIDENCE_LIST", "policy":"min_score=0.67"}
}
```

Use `blind_eval.digest(value)` for hashes (canonical sorted compact UTF-8 JSON).
Claim spans must cover all non-whitespace answer text with no overlap, and each
must cite retrieved evidence. Only `[[source-id]]` inline citations are accepted;
keep the citation list consistent with inline IDs. Duplicate IDs, unauthorized,
wrong-tenant, stale or altered evidence and malformed citations reject the run.
Abstentions use `abstained=true`, explanatory answer text, empty citations and
claims. For abstentions, an explicit empty `evidence: []` records a genuine zero-hit retrieval.
A non-abstained answer with no evidence is always rejected. The `evidence`
field itself may never be absent.
Empty answers and uncovered claims become explicit mechanical failures.

Coverage is **syntactic**, including caller-supplied claim spans; it cannot find
omitted semantic claims, determine truth, or prove entailment. Reviewers must
read the full answer, question and source context. Missing generation data is an
error, never a successful zero-case evaluation.

Create a reviews JSON list (initially `[]`). Run:

```bash
/workspace/.demo-bench-venv/bin/python blind_eval.py evaluate \
  --dataset eval/blind_development.json --prior eval/prior_exposure.json \
  --manifest eval/blind_development.manifest.json \
  --outputs /tmp/recorded-answers.json --reviews /tmp/human-reviews.json \
  --report /tmp/freeform-review-queue.json
```

Every row includes the full frozen case, output, hashes, mechanical issues and a
review queue for entailment, unsupported claims and conflicts. Human judgments
are separate records with exactly `id`, `output_sha256`, `reviewer`, `provenance`,
`entailed`, `unsupported_claims`, `conflicts` (last three are booleans).
For independently annotated cases, the answer reviewer must differ from the
original annotator; reuse is flagged as non-independent review. Bind each
review to the complete output hash. Record audit references in provenance;
preserve original judgments and adjudication history outside the report.
For a substantive answer, negative entailment, an unsupported claim or an
unresolved conflict fails review. For a proper abstention, `entailed=false`
is acceptable: no factual answer exists to entail, while the frozen
answerability label must justify the refusal. No string match assigns semantic judgments.

Exit 2 means invalid input, insufficient independent evidence, pending human
review or failed review; exit 0 means completed recorded review only, never
production approval. Full coverage of at least 100 independently reviewed blind
holdout cases is necessary; the workflow additionally requires the stated class
balance and representative collection. Reports contain sensitive questions and
answers: handle them with the same permissions as the evidence. This offline
contract verifies supplied snapshots, not current production authorization or
reviewer identity. No live generated evaluation is claimed.

### Runnable unreviewed example (no model used)

The checked-in `eval/blind_recording.synthetic.json` is hand-authored
contract data, **not a generated model answer**. `eval/blind_reviews.synthetic.json`
is an empty review list. The following command creates a review queue and
returns exit code **2** as intended; no independent evidence has been gathered:

```bash
python blind_eval.py evaluate \
  --dataset eval/blind_development.json --prior eval/prior_exposure.json \
  --manifest eval/blind_development.manifest.json \
  --outputs eval/blind_recording.synthetic.json \
  --reviews eval/blind_reviews.synthetic.json \
  --report /tmp/rag-offline-review-queue.json
```

The report includes recorded/reviewed/pending counts and explicit human
judgments of unsupported claims and conflicts when supplied. An absence of
mechanical flags does **not** establish semantic support or model quality.

## Local raw generation capture (independent custodian only)

`capture_local.py` adds an optional capture step without changing the frozen
0.67 policy, `blind_eval.py`, or `quality_eval.py`. **INSUFFICIENT INDEPENDENT
EVIDENCE** remains the status. No real generations were run on this host: its
available models are embeddinggemma and Whisper, with no generative Ollama
service. Tests use stubs only. This tool never starts services or downloads
models. An embedding/audio model is not a substitute for a generator.

An independent evaluator, **not the developer**, should run this only with an
already installed generative Ollama model and evaluator-controlled sealed data.
Replace paths and model tag; keep holdout files outside the repository. The
explicit flag acknowledges exposure of holdout content:

```bash
python capture_local.py \
  --dataset /custody/questions.json --manifest /custody/manifest.json \
  --prior /custody/prior-exposure.json --model INSTALLED_MODEL:TAG \
  --allow-unsealing-holdout --timeout 30 \
  --output /custody/raw-capture-new.json
```

Only literal `http://127.0.0.1:PORT` or `http://localhost:PORT` endpoints are
accepted (default port 11434). Connections use literal IPv4 loopback, ignore
proxy environment variables, refuse redirects, and have a total request deadline
of at most 120 seconds and a 4 MiB response cap. No API key or arbitrary URL is
accepted. Each prompt contains only that case's question, tenant and exact frozen
authorized evidence, excluding labels and other cases. This measures generation
on frozen evidence, not retrieval. Empty evidence records
`ABSTAINED_NO_EVIDENCE` without a generation request; an entirely empty-evidence
run also skips model lookup.

The tool validates permissions, prior exposure and seal before network access.
It requires the exact installed model name/tag and records the `/api/tags`
artifact digest, fixed generation options, prompt and its UTF-8 SHA, case/evidence
hashes, request metadata, raw response object, elapsed time and status. Keep the
model tag unchanged during capture: the digest is server-reported, not artifact
attestation. Fixed options do not guarantee identical inference across runtimes.
Both exact manifest **file bytes** SHA and canonical manifest hash are recorded.

Each record and the envelope carry canonical `blind_eval.digest` hashes; verify
by removing only the object's own hash field before hashing. Archive the envelope
hash and exact manifest SHA separately in custodian-controlled immutable storage.
Hashes detect changes against that trusted copy; they are not signatures and
cannot prevent an attacker replacing both the capture and the trusted hashes.

Output is exclusively created with owner-only permissions and never overwritten.
Preflight failure exits 2 and may leave an empty reserved file. Generation failure
records `GENERATION_FAILED`, preserves other rows and exits 2. Use a fresh path
for retries and retain failed attempts. `GENERATED` means a complete response was
captured, not a correct answer. There is no synthetic answer or dry-run fallback.

### Human handoff to the existing evaluator

Keep raw captures immutable. The custodian verifies archived hashes, exact
manifest bytes, case/evidence hashes and statuses. An authorized human curator
then reads `response.response` and its evidence and creates a **separate** output
using the exact `Offline free-form evaluation contract` above:

- Copy `id`, `tenant`, `case_sha256`, and `evidence` from the raw record.
- Set `run.model` to the captured tag plus artifact digest,
  `run.corpus_sha256` to the evidence hash, and `run.policy` to `min_score=0.67`.
- Preserve the raw answer text. The human determines abstention, citation IDs
  and exact claim character spans after reading the full answer and evidence.
  Missing/malformed model citations should remain visible as mechanical failures.
- Never turn failed generation into an answer. A no-evidence abstention may use
  explanatory refusal text and empty evidence/citations/claims.

Keep a sidecar custody ledger binding raw capture/record hashes, curated output
hash, curator identity, and annotation decisions or edits; the strict evaluator
schema has no slot for that provenance. Any human-edited answer must be explicitly
identified in the ledger and must not be reported as unmodified model quality.
No code here fabricates claim spans, uses string matching to infer support, or
scores entailment. Collect the separate independent semantic reviews bound to
the curated output hash, then run the existing `blind_eval.py evaluate` command
with the same dataset, manifest and prior list. Hashes, synthetic fixtures and
syntactic citation coverage do not establish semantic entailment or independence.

**Transport verification:** a test sends a real HTTP request to a short-lived
loopback-only test server, in addition to mocked redirect, timeout and size-limit
cases. The capture CLI also removes an empty reserved output file when preflight
fails. Successful model-backed generation is still untested on this host because
no local generative Ollama model/service is available.
