# Finite-choice semantic contract — synthetic only

A separate 12-case authored fixture covers negation, missing information, necessary conditions, unresolved conflicts and explicit supersession, joint evidence, entity scope, and absent authorized evidence. The expected option and required source IDs are never sent to the model. A correct choice with insufficient or wrong supporting IDs is a separate failure, as are unsupported answers, false refusals and invalid/unavailable generation. This is **not** independent human annotation, free-form entailment, full retrieval evaluation or release acceptance. The historical 28-case quality gate and 0.67 threshold are unchanged.

Offline verification (no dependencies, model or network):

```sh
python3 -B -m unittest discover -s tests -p test_semantic_contract_eval.py -v
```

Five tests passed on 2026-11-24 after the RDC environment recovered. The first live Qwen3:8b attempt was interrupted by loss of RDC responsiveness during model loading; no complete result was recovered. Do not count it as correct abstention or model-quality evidence. A future run requires explicit opt-in, an already installed model and sufficient resources; it is not part of the lightweight verification:

```sh
python3 -B semantic_contract_eval.py --allow-local-inference --output /tmp/semantic-contract-new.json
```

Fixed supplied evidence isolates the answer-selection problem; it does not measure actual retrieval accuracy. Do not tune on these exposed examples or label them independent.
