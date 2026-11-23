# Fifth-wave standalone persistent Python ONNX transport

Date: 2026-11-23. Base SHA: `2b7219deb5739b4cb03041660f04452f83a78fac`.
Scope: only `EdgeIntegratedScenarios/**`. No dependency installation, model
download, cloud requests, commit, push or MCP. Existing one-shot implementation
is unchanged. Generated synthetic test artifacts were temporary under this tree.

## Verified implementation

- `ai-assisted-ddos-defense/persistent_worker.py:load_scorer` calls the existing
  `EdgeAI/implementations/onnx-local/_onnx_worker.py:deny_network` before importing
  `runtime.OnnxWindowScorer`. Unsupported platform/filter fails closed. One
  constructor runs before ready; `serve` performs only serial `score` calls.
- `read_window` uses binary `readline(4097)` and rejects lines over 4096 bytes,
  missing LF, invalid UTF-8/JSON, duplicate/unknown/nested/nonintegral/bool fields,
  nonfinite constants and out-of-bounds windows. Empty EOF ends cleanly.
- `emit` flushes ready and each bounded seven-field response immediately.
  Invalid inference values/errors produce no response for that request.
- `main` suppresses native stdout/stderr diagnostics, retaining separate protocol
  stdout and fixed redacted failure stderr. No input or paths are echoed.
- `tests/test_persistent_worker.py` separates stdlib fixtures from opt-in native
  evidence. Real seccomp tests exercise AF_INET/AF_INET6/AF_UNIX, socketpair and
  direct libc socket calls; all fail with EPERM, no socket is opened.

## Exact local checks

```bash
python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_persistent_worker.py -v
```

10 discovered; **7 passed, 3 native tests explicitly skipped**, 1.500 seconds.
Includes a fixture scorer in an actual isolated subprocess using the actual
seccomp filter; tests flushed sequential frames, bounded malformed/oversized
input, inference errors and parent deadline/kill with incomplete input.
Startup/order tests cover unavailable filter/non-Linux and fixed failure output.
Fixtures are not native model evidence.

```bash
RUN_EDGE_PERSISTENT_ONNX_TESTS=1 /workspace/.edge-work-ai/EdgeAI/implementations/onnx-local/.venv/bin/python -B -m unittest discover -s EdgeIntegratedScenarios/tests -p test_persistent_worker.py -v
```

**10 passed, zero skipped**, 38.360 seconds. Existing venv only; tests enforce
NumPy 2.2.6, ONNX 1.19.1 and ONNX Runtime 1.23.2 and reject a non-venv interpreter.
The builder/scorer sources and temporary artifacts come from this assigned
worktree. Native worker launched with `-I -B`, returned ready and two actual
CPU model results with the same PID after both artifact files were moved away.
This verifies retained in-memory session operation rather than per-request
artifact/session loading. Native malformed/oversized/invalid UTF-8/duplicate
frames exited with no request response and exactly the fixed diagnostic.
An incomplete frame exceeded the test parent's 100 ms read deadline; the parent
killed/reaped it, started a replacement and received another native response.
This is a parent fixture deadline, not an HTTP latency measurement.

```bash
python3 -B -m unittest discover -s EdgeIntegratedScenarios/tests -v
python3 -B -m unittest discover -s EdgeIntegratedScenarios/ai-assisted-ddos-defense/tests -v
python3 -B EdgeIntegratedScenarios/task_inventory.py --check
git diff --check
```

Regression results: **46 discovered, 39 passed / 7 opt-in skipped**, 10.502
seconds; policy suite **10 passed**, 0.265 seconds. Inventory and whitespace
checks exited 0. No live HTTP tests were enabled in these commands.

## Remaining acceptance / trade-offs

This is standalone transport evidence. Persistent ASP.NET integration, its
one-outstanding-request guard, bounded queue, cancellation, restart cooldown,
shutdown and actual HTTP p95/p99/soak require independent acceptance. The worker
waits for input indefinitely by design; the parent owns startup/request deadlines,
kill/reap/restart and deterministic rule-only fallback. Linux/libseccomp and
trusted local artifacts are required. No production throughput, calibrated
security quality, cloud enforcement or production isolation claim is made.
