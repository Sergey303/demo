"""Exercise an actual local scorer under a Python socket audit guard."""
import argparse
import json
from pathlib import Path
import socket
import sys
from time import perf_counter

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--onnx-artifacts", type=Path, help="explicitly run the local traffic ONNX model")
    args = parser.parse_args()
    attempts = 0

    def deny_socket(event, _args):
        nonlocal attempts
        if event.startswith("socket."):
            attempts += 1
            raise PermissionError(f"network blocked by Python audit hook ({event})")

    sys.addaudithook(deny_socket)
    try:
        with socket.socket():
            parser.error("socket guard failed")
    except PermissionError:
        if attempts != 1:
            parser.error("socket probe failed without reaching the audit hook")
    attempts = 0

    started = perf_counter()
    try:
        if args.onnx_artifacts is None:
            sys.path.insert(0, str(ROOT / "scenarios" / "image-inference"))
            from inference import evaluate

            result = {"evaluation": evaluate()}
        else:
            sys.path.insert(0, str(ROOT / "implementations" / "onnx-local"))
            from runtime import OnnxWindowScorer

            scorer = OnnxWindowScorer(args.onnx_artifacts)
            window = dict(requests=250, seconds=10, errors=45, baseline_rps=3)
            result = {
                "model": scorer.model_id,
                "model_sha256": scorer.model_sha256,
                "provider": "CPUExecutionProvider",
                "score": scorer.score(window),
            }
    except (ImportError, OSError, RuntimeError, ValueError) as exc:
        parser.error(str(exc))
    if attempts:
        parser.error(f"inference attempted {attempts} Python socket operation(s)")
    print(json.dumps({
        **result,
        "guard": "cpython-socket-audit",
        "socket_probe_denied": True,
        "network_attempts_during_inference": attempts,
        "elapsed_ms": (perf_counter() - started) * 1000,
    }, indent=2))


if __name__ == "__main__":
    main()
