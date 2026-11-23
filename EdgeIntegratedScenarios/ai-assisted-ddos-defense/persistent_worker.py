"""Standalone serial NDJSON ONNX transport; caller owns deadlines and restart."""
import argparse
import json
from math import isfinite
import os
from pathlib import Path
import sys

ONNX_DIR = Path(__file__).resolve().parents[2] / "EdgeAI" / "implementations" / "onnx-local"
MAX_INPUT = 4096  # Includes the terminating newline, measured as UTF-8 bytes.
MAX_OUTPUT = 2048
FIELDS = {"requests", "seconds", "errors", "baseline_rps"}
ERROR = b"persistent worker failed\n"


class ArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        raise ValueError("invalid arguments")


def parse_args():
    parser = ArgumentParser(add_help=False, allow_abbrev=False)
    parser.add_argument("--artifact-dir", required=True, type=Path)
    parser.add_argument("--threshold", type=float, default=0.8)
    args = parser.parse_args()
    if (not args.artifact_dir.is_absolute() or not args.artifact_dir.is_dir()
            or not isfinite(args.threshold) or not 0 <= args.threshold <= 1):
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
    raise ValueError("nonfinite constant")


def read_window(stream):
    payload = stream.readline(MAX_INPUT + 1)
    if not payload:
        return None
    if len(payload) > MAX_INPUT or not payload.endswith(b"\n"):
        raise ValueError("invalid frame")
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


def load_scorer(artifact_dir):
    if sys.platform != "linux":
        raise RuntimeError("Linux seccomp required")
    sys.path.insert(0, str(ONNX_DIR))
    try:
        from _onnx_worker import deny_network
        deny_network()  # Must succeed BEFORE runtime import or graph access.
        from runtime import OnnxWindowScorer
        return OnnxWindowScorer(artifact_dir)
    finally:
        sys.path.pop(0)


def emit(stream, response):
    payload = (json.dumps(response, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")
    if len(payload) > MAX_OUTPUT:
        raise ValueError("oversized response")
    stream.write(payload)
    stream.flush()


def serve(scorer, threshold, source, destination):
    emit(destination, {"schema_version": 1, "kind": "ready", "model": "onnx-cpu"})
    while True:
        window = read_window(source)
        if window is None:
            return
        score = scorer.score(window)
        if type(score) not in (int, float) or not isfinite(score) or not 0 <= score <= 1:
            raise ValueError("invalid score")
        emit(destination, {
            "schema_version": 1,
            "action": "observe" if score >= threshold else "allow",
            "source": "onnx-cpu",
            "score": float(score),
            "fallback": "none",
            "status": "simulated",
            "policy_id": "demo-policy-v1",
        })


def main():
    # Native libraries may print paths/model diagnostics on fd 1/2. Suppress
    # these for the process lifetime; only our duplicated protocol fd escapes.
    output_fd = None
    try:
        output_fd = os.dup(1)
        with open(os.devnull, "wb") as sink:
            os.dup2(sink.fileno(), 1)
            os.dup2(sink.fileno(), 2)
        with os.fdopen(output_fd, "wb") as destination:
            output_fd = None
            args = parse_args()
            scorer = load_scorer(args.artifact_dir)  # Exactly one constructor.
            serve(scorer, args.threshold, sys.stdin.buffer, destination)
        return 0
    except Exception:
        # stderr was redirected above; retain a separate redacted channel below.
        return 1
    finally:
        if output_fd is not None:
            os.close(output_fd)


if __name__ == "__main__":
    # Keep a private stderr descriptor for the fixed failure diagnostic only.
    error_fd = os.dup(2)
    result = main()
    if result:
        os.write(error_fd, ERROR)
    os.close(error_fd)
    sys.exit(result)
