"""Estimate whether vibration crosses a learned threshold before a fault."""
from hashlib import sha256
import json

HORIZON = 3
# Each row: event minute, vibration (None = missing), arrival minute.
TRAIN = ((0, 2.0, 0), (1, 2.3, 1), (2, 1.8, 2), (3, 2.1, 3))
HOLDOUT = (
    (10, 2.0, 10), (11, 3.0, 11), (12, None, 12),
    (14, 3.1, 14), (15, 3.2, 15), (16, 2.1, 16), (17, 2.1, 17), (18, 3.9, 19),
    (19, 2.1, 19), (21, 2.2, 21),
)
FAULTS = (16, 23)


def evaluate():
    # Fit against healthy training measurements only. Fixed design margin.
    threshold = max(value for _, value, _ in TRAIN) + 0.5
    counts = dict.fromkeys(("tp", "fp", "tn", "fn"), 0)
    skipped = dict.fromkeys(("missing", "delayed"), 0)
    first_alert = {}
    for minute, vibration, arrival in HOLDOUT:
        if vibration is None:
            skipped["missing"] += 1
            continue
        if arrival != minute:
            skipped["delayed"] += 1
            continue
        fault = next((event for event in FAULTS if 0 < event - minute <= HORIZON), None)
        alert = vibration >= threshold
        if fault is not None:
            counts["tp" if alert else "fn"] += 1
            if alert:
                first_alert.setdefault(fault, minute)
        else:
            counts["fp" if alert else "tn"] += 1
    return {
        "dataset": "authored-synthetic-vibration-v1",
        "dataset_sha256": sha256(json.dumps((TRAIN, HOLDOUT, FAULTS)).encode()).hexdigest(),
        "model": "healthy-max-plus-margin-v1",
        "train_end": TRAIN[-1][0],
        "holdout_start": HOLDOUT[0][0],
        "holdout_records": len(HOLDOUT),
        "threshold": threshold,
        "horizon_minutes": HORIZON,
        "counts": counts,
        "precision": counts["tp"] / (counts["tp"] + counts["fp"]),
        "recall": counts["tp"] / (counts["tp"] + counts["fn"]),
        "skipped": skipped,
        "lead_minutes": [fault - first_alert[fault] for fault in FAULTS if fault in first_alert],
        "faults": len(FAULTS),
        "detected_faults": len(first_alert),
    }


if __name__ == "__main__":
    print(json.dumps(evaluate(), indent=2))
