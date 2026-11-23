# EAI-01 — deterministic anomaly baseline + model adapter

**P0; status PARTIAL — baseline.py implemented (rules-only), trained model and labelled evaluation TODO.** Extend local `baseline.py`, unit tests and a versioned scorer protocol. Start with deterministic rules on synthetic count/window input. This is a *baseline*, not trained ML.

Acceptance: input validated and bounded; score 0..1 reproducible; no client-provided user identity used as trusted security signal; threshold separate from score; tests cover zero traffic, spikes, missing data, overflow and false-positive examples. Keep a labelled fixture set and score baseline against it; log no client identifiers. TODO: actual trained ONNX scorer and calibration on held-out data, model drift.
