"""One-shot advisory JSON boundary for a trusted local process caller."""

import argparse
import json
import os
from math import isfinite
from pathlib import Path
from runpy import run_path
from subprocess import TimeoutExpired
import sys
from threading import Thread
from time import monotonic

EDGE_AI = Path(__file__).resolve().parents[2] / "EdgeAI"
ONNX_DIR = EDGE_AI / "implementations" / "onnx-local"
MAX_INPUT = 4096
FIELDS = {"requests", "seconds", "errors", "baseline_rps"}


class ArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        raise ValueError("invalid arguments")


def parse_args():
    parser = ArgumentParser(add_help=False, allow_abbrev=False)
    parser.add_argument("--artifact-dir", type=Path)
    parser.add_argument("--timeout-ms", required=True, type=int)
    parser.add_argument("--threshold", required=True, type=float)
    args = parser.parse_args()
    if (not 100 <= args.timeout_ms <= 2500 or not 0 <= args.threshold <= 1
            or (args.artifact_dir is not None and not args.artifact_dir.is_absolute())):
        raise ValueError("invalid arguments")
    return args


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate key")
        result[key] = value
    return result


def reject_constant(value):
    raise ValueError("nonfinite JSON constant")


def read_window(timeout):
    stdin_fd = sys.stdin.fileno()
    payload = bytearray()

    def read_to_eof():
        # Raw reads avoid holding the interpreter's buffered stdin lock if the
        # caller leaves the pipe open and the daemon reader outlives the deadline.
        try:
            while len(payload) <= MAX_INPUT:
                chunk = os.read(stdin_fd, MAX_INPUT + 1 - len(payload))
                if not chunk:
                    return
                payload.extend(chunk)
        except OSError:
            payload.clear()

    reader = Thread(target=read_to_eof, daemon=True)
    reader.start()
    reader.join(timeout)
    if reader.is_alive():
        raise TimeoutError("stdin deadline exceeded")
    if len(payload) > MAX_INPUT:
        raise ValueError("oversized input")
    window = json.loads(payload.decode("utf-8"), object_pairs_hook=unique_object,
                        parse_constant=reject_constant)
    if (type(window) is not dict or window.keys() != FIELDS
            or any(type(value) is not int for value in window.values())
            or not 0 <= window["requests"] <= 10_000_000
            or not 1 <= window["seconds"] <= 3600
            or not 0 <= window["errors"] <= window["requests"]
            or not 0 <= window["baseline_rps"] <= 10_000_000):
        raise ValueError("invalid window")
    return window


def load_isolated():
    sys.path.insert(0, str(ONNX_DIR))
    try:
        import isolated
        return isolated
    finally:
        sys.path.pop(0)


def validated_score(result, result_type):
    if (type(result) is not result_type or type(result.scores) is not tuple
            or len(result.scores) != 1 or type(result.mode) is not str):
        raise ValueError("invalid scorer response")
    score = result.scores[0]
    if type(score) not in (int, float) or not 0 <= score <= 1 or not isfinite(score):
        raise ValueError("invalid score")
    if result.mode == "onnx-cpu" and result.reason is None:
        return "onnx-cpu", float(score), "none"
    if (result.mode == "rule-only" and type(result.reason) is str
            and result.reason in ("timeout", "unavailable")):
        return "rule-only", float(score), result.reason
    raise ValueError("invalid scorer response")


def score_window(window, artifact_dir, deadline):
    fallback = "unavailable"
    if artifact_dir is not None:
        try:
            isolated = load_isolated()
            remaining = deadline - monotonic()
            if remaining <= 0:
                raise TimeoutError("scoring deadline exceeded")
            scorer = isolated.IsolatedWindowScorer(artifact_dir, timeout_seconds=remaining)
            return validated_score(scorer.score(window), isolated.ScoreResult)
        except (TimeoutError, TimeoutExpired):
            fallback = "timeout"
        except (OSError, ValueError, ImportError, RecursionError):
            pass

    rules = run_path(str(EDGE_AI / "scenarios" / "traffic-anomaly-detection" / "baseline.py"))
    return "rule-only", rules["score"](rules["Window"](**window)), fallback


def main():
    try:
        args = parse_args()
        timeout = args.timeout_ms / 1000
        deadline = monotonic() + timeout
        window = read_window(timeout)
        source, score, fallback = score_window(window, args.artifact_dir, deadline)
        response = {
            "schema_version": 1,
            "action": "observe" if score >= args.threshold else "allow",
            "source": source,
            "score": score,
            "fallback": fallback,
            "status": "simulated",
            "policy_id": "demo-policy-v1",
        }
        output = json.dumps(response, separators=(",", ":"), allow_nan=False) + "\n"
        os.write(sys.stdout.fileno(), output.encode("ascii"))
    except Exception:
        print("inline advisory failed", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
