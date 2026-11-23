"""Deterministic rules-only baseline; no AI model is trained or called."""
from dataclasses import dataclass
from math import isfinite


@dataclass(frozen=True)
class Window:
    requests: int
    seconds: int
    errors: int
    baseline_rps: float

    def __post_init__(self):
        if type(self.requests) is not int or not 0 <= self.requests <= 10**7:
            raise ValueError("invalid requests")
        if type(self.seconds) is not int or not 1 <= self.seconds <= 3600:
            raise ValueError("invalid seconds")
        if type(self.errors) is not int or not 0 <= self.errors <= self.requests:
            raise ValueError("invalid errors")
        if not isinstance(self.baseline_rps, (int, float)) or not isfinite(self.baseline_rps) or not 0 <= self.baseline_rps <= 10**7:
            raise ValueError("invalid baseline")


def score(window: Window) -> float:
    """Synthetic heuristic score in [0,1], not a calibrated probability."""
    rps = window.requests / window.seconds
    ratio = rps / max(float(window.baseline_rps), 1.0)
    spike = min(1.0, max(0.0, (ratio - 1.5) / 8.5))
    error_rate = window.errors / max(window.requests, 1)
    return round(min(1.0, 0.7 * spike + 0.3 * error_rate), 6)
