# Offline inference

Run from the repository root with CPython.

```bash
python3 -B EdgeAI/scenarios/offline-inference/run.py
```

The dedicated process installs a socket audit guard before loading the scorer. A socket-creation probe must reach the guard and be denied before the image classifier fits and scores its holdout. The report includes elapsed time and the count of Python socket operations attempted during inference. Any such attempt fails the run, even if scorer code catches the denial. The default path needs no cached files or downloaded artifacts.

To exercise the existing traffic ONNX CPU scorer, supply an already generated local artifact directory and an environment that already has NumPy and ONNX Runtime. An unavailable dependency or artifact fails the command.

```bash
python3 -B EdgeAI/scenarios/offline-inference/run.py --onnx-artifacts EdgeAI/implementations/onnx-local/artifacts
```

The audit guard covers CPython socket events. Native system calls and child processes require OS isolation. On a Linux host that permits network namespaces, add an OS-level check with `unshare -n -- python3 -B EdgeAI/scenarios/offline-inference/run.py`. This worktree's environment denied network namespace creation. The default verification covers genuine standard-library inference and the audit guard. Optional native ONNX execution and hard latency or memory bounds remain unverified here.
