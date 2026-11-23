"""Synthetic policy: score can request observation, not an autonomous block."""
from dataclasses import dataclass
from math import isfinite


@dataclass(frozen=True)
class Decision:
    action: str
    source: str
    policy_id: str = "demo-policy-v1"
    status: str = "simulated"


def decide(rule_action: str, anomaly_score: float | None = None, threshold: float = 0.8) -> Decision:
    if rule_action not in {"allow", "observe", "block"}:
        raise ValueError("invalid deterministic rule action")
    if not isfinite(threshold) or not 0 < threshold <= 1:
        raise ValueError("invalid threshold")
    if rule_action == "block":
        return Decision("block", "rule")
    if anomaly_score is None or not isinstance(anomaly_score, (int, float)) or not isfinite(anomaly_score) or not 0 <= anomaly_score <= 1:
        return Decision(rule_action, "rule-fallback")
    if anomaly_score >= threshold and rule_action == "allow":
        return Decision("observe", "anomaly-advisory")
    return Decision(rule_action, "rule")
