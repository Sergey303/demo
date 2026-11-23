# Traffic anomaly detection — rules-only baseline

**Implemented:** `baseline.py` generates a deterministic bounded heuristic score from request windows. `fixtures.jsonl` contains 12 **authored synthetic** examples, explicitly including legitimate spikes and low-rate abuse. `evaluate.py` reports a confusion matrix, precision/recall, FPR/FNR and dataset SHA256. Thresholds are not calibrated attack probabilities.

Run from the repository root:

```sh
python3 EdgeAI/scenarios/traffic-anomaly-detection/evaluate.py --threshold 0.5
python3 -m unittest discover -s EdgeAI/scenarios/traffic-anomaly-detection/tests -v
```

The fixture intentionally includes false positives and false negatives. Accuracy on the synthetic examples **cannot** be used to describe security performance on real traffic. No requests are sent and no personal data are recorded.

[Remaining Codex task](TASK.md): independent labelled dataset, model scorer, temporal features, calibration, drift, model fallback and reproducible holdout evaluation.
