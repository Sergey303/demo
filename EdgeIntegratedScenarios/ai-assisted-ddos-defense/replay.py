"""Deterministic replay: compare rule-only against advisory anomaly scoring.

This is a local synthetic triage evaluation, not a deployed anti-DDoS system.
"""
from __future__ import annotations

import argparse
import importlib.util
from hashlib import sha256
import json
from math import isfinite
from pathlib import Path
import re
import sys

from policy import decide

BASE = Path(__file__).resolve().parents[2] / "EdgeAI" / "scenarios" / "traffic-anomaly-detection" / "baseline.py"
MAX_BYTES, MAX_ROWS = 1_000_000, 1000
WINDOW_FIELDS = {"requests", "seconds", "errors", "baseline_rps"}
SAFE_ID = re.compile(r"^[a-z0-9_-]{1,64}$")


def load_anomaly():
    """Load the neighboring project's explicit standalone scorer, no provider SDK."""
    spec = importlib.util.spec_from_file_location("edge_demo_anomaly", BASE)
    if spec is None or spec.loader is None:
        raise RuntimeError("EdgeAI baseline unavailable")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _rates(confusion: dict[str, int]) -> dict:
    tp, tn, fp, fn = (confusion[key] for key in ("tp", "tn", "fp", "fn"))

    def rate(num: int, den: int) -> float | None:
        return round(num / den, 6) if den else None

    return {
        "confusion": confusion,
        "flagged_precision": rate(tp, tp + fp),
        "flagged_recall": rate(tp, tp + fn),
        "flagged_false_positive_rate": rate(fp, fp + tn),
    }


def evaluate_text(data: str, threshold: float = 0.5, scorer=None) -> dict:
    if type(threshold) not in (float, int) or not isfinite(threshold) or not 0 < threshold <= 1:
        raise ValueError("threshold must be finite in (0,1]")
    if len(data.encode("utf-8")) > MAX_BYTES:
        raise ValueError("dataset too large")

    anomaly = load_anomaly()
    if scorer is None:
        scorer = lambda window: anomaly.score(anomaly.Window(**window))
    base = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}
    assisted = base.copy()
    ids = set()
    changed_to_observe = 0
    fallback_count = 0
    blocked_benign = 0
    audit = []
    rows = data.splitlines()
    if len(rows) > MAX_ROWS:
        raise ValueError("too many records")
    if not rows:
        raise ValueError("empty dataset")
    for index, line in enumerate(rows, start=1):
        try:
            item = json.loads(line)
            if not isinstance(item, dict) or set(item) != {"id", "label", "rule_action", "window", "model_failure"}:
                raise ValueError("incorrect record fields")
            identifier = item["id"]
            if not isinstance(identifier, str) or not SAFE_ID.fullmatch(identifier) or identifier in ids:
                raise ValueError("invalid/duplicate synthetic id")
            ids.add(identifier)
            label = item["label"]
            if type(label) is not int or label not in (0, 1):
                raise ValueError("invalid label")
            if type(item["model_failure"]) is not bool:
                raise ValueError("model_failure must be boolean")
            action = item["rule_action"]
            if action not in ("allow", "observe", "block") or not isinstance(action, str):
                raise ValueError("invalid rule action")
            window = item["window"]
            if not isinstance(window, dict) or set(window) != WINDOW_FIELDS:
                raise ValueError("incorrect window fields")
            anomaly.Window(**window)  # Always validate, including injected scorer and outage.
            rule = decide(action)
            try:
                s = None if item["model_failure"] or action == "block" else scorer(window)
            except Exception:  # Untrusted inference adapter failed: retain the deterministic rule.
                s = None
            decision = decide(action, s, threshold)
            fallback_count += int(decision.source == "rule-fallback")
            changed_to_observe += int(rule.action == "allow" and decision.action == "observe")
            blocked_benign += int(decision.action == "block" and label == 0)
            audit.append({"synthetic_id": identifier, "rule_action": rule.action,
                          "assisted_action": decision.action, "source": decision.source,
                          "policy_id": decision.policy_id, "status": decision.status})
            for stats, candidate in ((base, rule), (assisted, decision)):
                flag = candidate.action in ("observe", "block")
                key = ("tp" if label else "fp") if flag else ("fn" if label else "tn")
                stats[key] += 1
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"bad synthetic row {index}: {exc}") from exc

    return {
        "status": "simulated",
        "rule_only": _rates(base),
        "assisted": _rates(assisted),
        "records": len(ids),
        "threshold": threshold,
        "dataset_sha256": sha256(data.encode("utf-8")).hexdigest(),
        "new_observations": changed_to_observe,
        "audit": audit,
        "model_fallbacks": fallback_count,
        "hard_blocked_benign": blocked_benign,
        "note": "observe is a flag, not a block; synthetic rule/labels, heuristic score, no real provider test",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Offline synthetic rule-only versus anomaly-advisory evaluation")
    parser.add_argument("--dataset", type=Path, default=Path(__file__).with_name("fixtures.jsonl"))
    parser.add_argument("--threshold", type=float, default=0.5)
    args = parser.parse_args()
    try:
        if args.dataset.stat().st_size > MAX_BYTES:
            raise ValueError("dataset too large")
        report = evaluate_text(args.dataset.read_text(encoding="utf-8"), args.threshold)
    except (OSError, ValueError, UnicodeError) as exc:
        parser.error(str(exc))
    print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
