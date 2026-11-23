"""Versioned, bounded feature transformation shared by training and inference.

Inputs describe synthetic request windows. Features are not real-world attack evidence.
"""
from __future__ import annotations
from math import isfinite

MODEL_ID = "synthetic-window-logreg-v1"
FEATURE_NAMES = ("rate_ratio_16", "error_fraction", "rps_100", "volume_3000")
INPUT_FIELDS = frozenset(("requests", "seconds", "errors", "baseline_rps"))


def vectorize(window: dict) -> list[float]:
    if not isinstance(window, dict) or set(window) != INPUT_FIELDS:
        raise ValueError("window must have exactly four fields")
    requests, seconds, errors = (window[k] for k in ("requests", "seconds", "errors"))
    baseline = window["baseline_rps"]
    if type(requests) is not int or not 0 <= requests <= 10_000_000:
        raise ValueError("invalid requests")
    if type(seconds) is not int or not 1 <= seconds <= 3600:
        raise ValueError("invalid seconds")
    if type(errors) is not int or not 0 <= errors <= requests:
        raise ValueError("invalid errors")
    if type(baseline) not in (float, int) or not isfinite(baseline) or not 0 <= baseline <= 10_000_000:
        raise ValueError("invalid baseline_rps")

    rps = requests / seconds
    ratio = rps / max(float(baseline), 1.0)
    return [
        float(min(1.0, ratio / 16.0)),
        float(errors / max(requests, 1)),
        float(min(1.0, rps / 100.0)),
        float(min(1.0, requests / 3000.0)),
    ]
