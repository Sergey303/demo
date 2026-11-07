# Synthetic Qwen3 local capture comparison — 2026-11-07

**Scope:** deliberately synthetic, developer-authored cases, NOT independent human
labels, NOT an unexposed blind holdout, NOT evidence of production RAG quality.
This tests raw answer capture, obvious citation syntax violations, and explicit
no-evidence abstention. Source relevance/semantic entailment require human review.

## Setup and reproduction

- RDC Ubuntu 24.04, CPU-only Ollama 0.40.15, model `qwen3:1.7b`.
- Same [11-case frozen synthetic fixture](eval/synthetic_capture/dataset.json)
  in two **separate** recordings: six answerable, two related but insufficient,
  three with no authorized evidence; tenants `amber` and `violet`.
- [Deterministic fixture builder](eval/synthetic_capture/build.py) and
  [tests](tests/test_synthetic_capture.py) verify the existing prior-exposure
  list, uniqueness, source ownership and manifest sealing.
- The recorder does not call Ollama on the three cases with empty evidence.
- Both captures are stored locally under `/tmp`, **not committed to Git**.
  The manifest byte SHA in both is
  `2daee9db1173f89c7232c03669244d8d27d93c971d57c055d57cfa169a9c5911`.

From `python-ai/rag-docs`, run:

```bash
rdc-ollama-start
python capture_local.py \
  --dataset eval/synthetic_capture/dataset.json \
  --manifest eval/synthetic_capture/manifest.json \
  --prior eval/synthetic_capture/prior_exposure.json \
  --model qwen3:1.7b --endpoint http://127.0.0.1:11434 \
  --timeout 110 --allow-unsealing-holdout \
  --output /tmp/new-synthetic-capture.json

python capture_diagnostics.py \
  --dataset eval/synthetic_capture/dataset.json \
  --manifest eval/synthetic_capture/manifest.json \
  --prior eval/synthetic_capture/prior_exposure.json \
  --capture /tmp/new-synthetic-capture.json
```

The `--allow-unsealing-holdout` flag is used **only for this already exposed
synthetic test fixture**. A real independent holdout must remain under evaluator
custody. Never use a previously existing output path; the recorder forbids
overwriting.

## Results from actual local model invocations

| Mechanical metric | Historical thinking-enabled* | New `think=false` |
| --- | ---: | ---: |
| Total frozen cases | 11 | 11 |
| Cases with evidence sent to LLM | 8 | 8 |
| Cases without evidence, skipped by recorder | 3/3 | 3/3 |
| Nonempty visible generated answer | 6/8 | 8/8 |
| Generated answers with valid `[[authorized-source-id]]` syntax | 3/8 | 4/8 |
| Generated answers missing/invalid citation syntax | 5/8 | 4/8 |
| Sum of eight model call elapsed times | 189.57 s | 42.05 s |

*The historical capture did **not** send an explicit `think` setting. Qwen3
used hidden thinking; two requests exhausted `num_predict=512` with
`done_reason=length`, leaving empty visible responses. At the time, recorder
incorrectly labeled them `GENERATED`. The new recorder sends top-level
`think=false` and rejects `length`, empty or whitespace-only answers.
The old capture remains immutable. This is a small uncontrolled experiment,
**not** a performance benchmark or proof of causality.

The new model visibly answered all six answerable synthetic questions and
produced nonempty responses for two related-but-insufficient questions.
Only four of eight generated responses used the mandated `[[id]]` notation.
For a question asking **who can copy a key**, the model inferred that someone
with locker access may copy it, while acknowledging the permission was not
specified. That is a **potential unsupported inference requiring human
review**, not a mechanically scored hallucination. For the other insufficient
case (inspection cost), it explicitly stated the evidence was insufficient.
No cross-tenant evidence was passed to the model by the frozen-case recorder.

The syntactic citation validator cannot prove that a passage supports a claim.
It reports malformed, missing or unauthorized citation identifiers and
retains `INSUFFICIENT INDEPENDENT EVIDENCE` as the review status.

## Reproducibility identifiers

- Historical raw capture envelope SHA:
  `eea7499e91d4c9ce93420030de89e6ee54751bf17f53309a2f2b912a69013c9f`
- New no-thinking raw capture envelope SHA:
  `1fb56d8e6ef75f11cfa0fb9a0e3b337402bda1280d4bb312a6f3a958343f9f45`

These are application-level canonical JSON digests. They are not
cryptographic attestations or signatures, and the original local raw files
must be retained independently for verification. Model execution involved
real local inference, but all cases and labels are developer-created.

**Next decision:** improve citation-format reliability and unsupported-answer
abstention on a separate **development** set; do not optimize against an
independently sealed holdout or silently relabel exposed examples.
