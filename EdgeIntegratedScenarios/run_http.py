"""Measure two local ASP.NET Core configurations, then compare offline advice."""
from __future__ import annotations

import argparse
from dataclasses import asdict
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
PROBE = ROOT / "EdgeNetworkSecurity/shared/traffic-generator/probe.py"
ONNX_RUNTIME = ROOT / "EdgeAI/implementations/onnx-local/runtime.py"
ONNX_ARTIFACTS = ONNX_RUNTIME.with_name("artifacts")
ONNX_TIMEOUT_SECONDS = 5
THRESHOLD = 0.5
BASELINE_RPS = 1  # Authored synthetic reference, not learned from HTTP telemetry.

sys.path.insert(0, str(HERE / "ai-assisted-ddos-defense"))
from policy import decide
from replay import load_anomaly


def load_probe():
    spec = importlib.util.spec_from_file_location("edge_loopback_probe", PROBE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def onnx_score(window: dict, artifacts: Path) -> tuple[float | None, dict]:
    """Bound imports, session initialization and CPU inference together."""
    try:
        result = subprocess.run(
            [sys.executable, "-E", "-B", str(ONNX_RUNTIME),
             "--artifact-dir", str(artifacts), "--window-json", json.dumps(window)],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True,
            timeout=ONNX_TIMEOUT_SECONDS, check=True,
        )
        output = json.loads(result.stdout)
        score = output["score"]
        if (output["provider"] != "CPUExecutionProvider"
                or type(score) not in (int, float)
                or not 0 <= score <= 1):
            raise ValueError("invalid scorer output")
        return score, {
            "kind": "onnx_cpu", "status": "scored",
            "model_id": output["model_id"], "model_sha256": output["model_sha256"],
        }
    except subprocess.TimeoutExpired:
        reason = "timeout"
    except (OSError, subprocess.CalledProcessError, ValueError, KeyError, TypeError):
        reason = "unavailable_or_invalid"
    return None, {"kind": "onnx_cpu", "status": "rule_fallback", "reason": reason}


def compare(observed: dict, duration: int, expected: set[str], artifacts: Path | None) -> dict:
    counts = observed.get("responses_by_status", {})
    if observed["status"] != "local-tested" or counts.keys() != expected:
        return {"status": "skipped", "reason": "unexpected_or_incomplete_http_observations"}

    window = {
        "requests": observed["requests_attempted"],
        "seconds": duration,
        "errors": counts.get("429", 0) + counts.get("503", 0),
        "baseline_rps": BASELINE_RPS,
    }
    score, scoring = None, {"status": "skipped", "reason": "no_allowed_responses"}
    if counts.get("200"):
        if artifacts is not None:
            score, scoring = onnx_score(window, artifacts)
        else:
            anomaly = load_anomaly()
            score = anomaly.score(anomaly.Window(**window))
            scoring = {"kind": "heuristic", "status": "scored"}

    cohorts = {}
    for status, count in counts.items():
        if status == "503":
            cohorts[status] = {
                "count": count, "rule_only": "unavailable", "assisted": "unavailable",
                "source": "preserved_http_failure",
            }
            continue
        if status == "429":
            # HTTP rate limiting is temporary quota rejection, NOT a WAF hard block.
            # The AI policy does not alter the observed HTTP response.
            cohorts[status] = {
                "count": count, "rule_only": "rate_limited",
                "assisted": "rate_limited", "source": "preserved_http_rate_limit",
            }
            continue
        cohorts[status] = {
            "count": count,
            "rule_only": asdict(decide("allow", 0.0, THRESHOLD)),
            "assisted": asdict(decide("allow", score, THRESHOLD)),
        }
    return {
        "status": "simulated", "window": window, "threshold": THRESHOLD,
        "score": score, "scoring": scoring, "cohorts_by_observed_http_status": cohorts,
    }


def run(rate_port: int, unavailable_port: int, artifacts: Path | None = None) -> dict:
    if (type(rate_port) is not int or type(unavailable_port) is not int
            or rate_port == unavailable_port):
        raise ValueError("two distinct loopback ports are required")
    probe = load_probe()
    phases = [
        ("fixed_window", rate_port, {"200", "429"}),
        ("quota_unavailable", unavailable_port, {"503"}),
    ]
    for _, port, _ in phases:
        probe.validate_url(f"http://127.0.0.1:{port}/api/expensive")

    duration, rate = 1, 10
    observations = {}
    traffic_deadline = time.monotonic() + 60
    for name, port, _ in phases:
        if observations:
            time.sleep(1 / rate)  # Preserve spacing across the phase boundary.
        scenario = json.dumps({
            "id": name, "target": "local", "durationSeconds": duration,
            "maxRequestsPerSecond": rate, "trafficProfile": "baseline",
        }, sort_keys=True)
        if time.monotonic() + duration >= traffic_deadline:
            observations[name] = {"status": "skipped", "reason": "traffic_deadline"}
            break
        observations[name] = probe.run_probe(scenario, f"http://127.0.0.1:{port}/api/expensive")
        if observations[name]["status"] == "interrupted":
            break

    advice = {
        name: compare(observations[name], duration, expected, artifacts)
        for name, _, expected in phases if name in observations
    }
    complete = len(advice) == len(phases) and all(
        entry["status"] == "simulated" for entry in advice.values()
    )
    return {
        "schema_version": 1, "experiment": "loopback_http_advice",
        "status": "complete" if complete else "incomplete",
        "workload": {"synthetic": True, "rps_cap": rate, "seconds_per_phase": duration,
                     "traffic_deadline_seconds": 60,
                     "total_attempt_cap": rate * duration * len(phases)},
        "http_observations": observations,
        "offline_policy_comparison": advice,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rate-port", type=int, required=True)
    parser.add_argument("--unavailable-port", type=int, required=True)
    parser.add_argument("--onnx", nargs="?", type=Path, const=ONNX_ARTIFACTS,
                        metavar="ARTIFACT_DIR", help="Use prebuilt local CPU model artifacts")
    args = parser.parse_args()
    try:
        report = run(args.rate_port, args.unavailable_port, args.onnx)
    except ValueError as exc:
        parser.error(str(exc))
    print(json.dumps(report, indent=2, sort_keys=True, allow_nan=False))
    return int(report["status"] != "complete")


if __name__ == "__main__":
    sys.exit(main())
