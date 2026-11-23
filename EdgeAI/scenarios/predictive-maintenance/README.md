# Predictive maintenance

```bash
python3 -B EdgeAI/scenarios/predictive-maintenance/evaluate.py
```

The authored vibration series in `evaluate.py` fits a threshold from healthy samples at minutes 0–3 using their maximum plus a fixed 0.5-unit margin. Holdout starts at minute 10. An alert uses the current sample only. A sample earns a positive label for scoring if a fault occurs 1–3 minutes later. Missing or delayed samples are skipped and counted separately. Faults are used for scoring and lead-time calculation after prediction.

The holdout has 10 samples, 8 scored samples, two true alerts, one false alert, four true negatives, and one missed alert. Precision and recall are each 2/3 among scored samples. One of two faults receives an alert, with two minutes of lead time. Multiple alerts for the same fault count once in the event-level result, at the first alert. These figures describe the authored series. Independent machine telemetry and deployment validation remain open.
