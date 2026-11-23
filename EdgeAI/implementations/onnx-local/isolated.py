"""Dependency-free parent API for one-shot offline ONNX scoring on Linux."""
from __future__ import annotations

from dataclasses import dataclass
import json
from math import isfinite
import os
from pathlib import Path
from runpy import run_path
from selectors import DefaultSelector, EVENT_READ
from subprocess import DEVNULL, PIPE, Popen, TimeoutExpired
import sys
from time import monotonic
from typing import Literal

from features import vectorize

MAX_BATCH = 32
MAX_INPUT = 4096
MAX_OUTPUT = 2048
HERE = Path(__file__).resolve().parent
_RULES = run_path(str(HERE.parents[1] / "scenarios/traffic-anomaly-detection/baseline.py"))


@dataclass(frozen=True)
class ScoreResult:
    mode: Literal["onnx-cpu", "rule-only"]
    scores: tuple[float, ...]
    reason: Literal["timeout", "unavailable"] | None = None


def _run_worker(artifact_dir: Path, request: bytes, timeout: float) -> bytes:
    # The compact request is at most Linux PIPE_BUF, so it fits the empty pipe
    # even if the worker has not started reading.
    command = [sys.executable, "-I", "-B", str(HERE / "_onnx_worker.py"), str(artifact_dir)]
    deadline = monotonic() + timeout
    with Popen(command, stdin=PIPE, stdout=PIPE, stderr=DEVNULL, close_fds=True,
               shell=False, bufsize=0, env={"OPENBLAS_NUM_THREADS": "1", "OMP_NUM_THREADS": "1"}) as child:
        try:
            child.stdin.write(request)
            child.stdin.close()
            output = bytearray()
            with DefaultSelector() as selector:
                selector.register(child.stdout, EVENT_READ)
                while True:
                    remaining = deadline - monotonic()
                    if remaining <= 0 or not selector.select(remaining):
                        raise TimeoutError
                    chunk = os.read(child.stdout.fileno(), MAX_OUTPUT + 1 - len(output))
                    if not chunk:
                        break
                    output.extend(chunk)
                    if len(output) > MAX_OUTPUT:
                        raise ValueError("oversized worker output")
            returncode = child.wait(timeout=max(0, deadline - monotonic()))
            if monotonic() >= deadline:
                raise TimeoutError
            if returncode != 0:
                raise ValueError("worker failed")
            return bytes(output)
        finally:
            if child.poll() is None:
                child.kill()
                child.wait()


class IsolatedWindowScorer:
    """Return an entire ONNX batch or the equivalent deterministic rules batch."""

    def __init__(self, artifact_dir: Path, *, timeout_seconds: float = 2.0):
        if type(timeout_seconds) not in (int, float) or not 0 < timeout_seconds <= 30:
            raise ValueError("timeout_seconds must be in (0, 30]")
        self.artifact_dir = Path(artifact_dir)
        if len(os.fsencode(self.artifact_dir)) > 4096:
            raise ValueError("artifact directory path is too long")
        self.timeout_seconds = timeout_seconds

    def score_many(self, windows: list[dict]) -> ScoreResult:
        if type(windows) is not list or not 1 <= len(windows) <= MAX_BATCH:
            raise ValueError("batch must contain 1..32 windows")
        for window in windows:
            if type(window) is not dict or len(window) != 4:
                raise ValueError("window must have exactly four fields")
            vectorize(window)
        request = json.dumps(windows, separators=(",", ":"), allow_nan=False).encode("ascii")
        if len(request) > MAX_INPUT:
            raise ValueError("oversized worker request")

        reason = "unavailable"
        # Missing locally generated artifacts do not need a costly worker startup.
        # The child still validates provenance, hashes and graph content.
        has_artifacts = (
            (self.artifact_dir / "manifest.json").is_file()
            and (self.artifact_dir / "model.onnx").is_file()
        )
        if sys.platform == "linux" and has_artifacts:
            try:
                scores = json.loads(_run_worker(self.artifact_dir, request, self.timeout_seconds))
                if (type(scores) is not list or len(scores) != len(windows)
                        or any(type(value) not in (int, float) or not 0 <= value <= 1
                               or not isfinite(value) for value in scores)):
                    raise ValueError("invalid worker output")
                return ScoreResult("onnx-cpu", tuple(float(value) for value in scores))
            except (TimeoutError, TimeoutExpired):
                reason = "timeout"
            except (OSError, ValueError, RecursionError):
                pass
        scores = tuple(_RULES["score"](_RULES["Window"](**window)) for window in windows)
        return ScoreResult("rule-only", scores, reason)

    def score(self, window: dict) -> ScoreResult:
        return self.score_many([window])
