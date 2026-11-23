# EAI-01 — deterministic anomaly baseline + model adapter

**P0; status PARTIAL — rules-only `baseline.py`, authored labelled `fixtures.jsonl`, reproducible `evaluate.py`, and unit tests DONE.** Next: versioned model scorer protocol, real independent labelled dataset, held-out calibration and model drift. This baseline is not trained ML. Run `python3 -m unittest discover -s EdgeAI/scenarios/traffic-anomaly-detection/tests -v`.

Acceptance: input validated and bounded; score 0..1 reproducible; no client-provided user identity used as trusted security signal; threshold separate from score; tests cover zero traffic, spikes, missing data, overflow and false-positive examples. Keep a labelled fixture set and score baseline against it; log no client identifiers. TODO: actual trained ONNX scorer and calibration on held-out data, model drift.
