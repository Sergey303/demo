#!/usr/bin/env python3
"""One-command local hiring demo launcher, with explicit API restart.

Runs the existing ASP.NET Core app and Vite dashboard. No fake API or database.
Only use the isolated disposable demo database. Do not expose ports publicly.
"""
from __future__ import annotations

import os
from pathlib import Path
import shutil
import socket
import signal
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
API_URL = "http://127.0.0.1:5077"
FRONTEND_URL = "http://127.0.0.1:4173/dashboard/hiring-demo"
FRONTEND = ROOT / "bootstrap5"
API_PROJECT = ROOT / "dotnet-outbox" / "src" / "ReliableJobs.csproj"


def is_ready(url: str = API_URL + "/ready") -> bool:
    try:
        with urlopen(url, timeout=2) as response:
            return response.status == 200
    except (OSError, URLError, TimeoutError):
        return False


def api_command() -> list[str]:
    return ["dotnet", "run", "--project", str(API_PROJECT), "--urls", API_URL]


def web_command() -> list[str]:
    return ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", "4173", "--strictPort"]


def check_prerequisites() -> None:
    if not os.environ.get("ConnectionStrings__Jobs"):
        raise RuntimeError(
            "Set ConnectionStrings__Jobs for the isolated demo database; "
            "see hiring-demo/README.md. No production DB is permitted."
        )
    for command in ("dotnet", "node", "npm"):
        if not shutil.which(command):
            raise RuntimeError("Missing " + command + "; install it before running the demo.")
    if not (FRONTEND / "node_modules").is_dir():
        raise RuntimeError("Run 'cd bootstrap5 && npm ci' once to install the locked frontend dependencies.")
    if not API_PROJECT.is_file():
        raise RuntimeError("ReliableJobs.csproj not found. Run from the complete demo repository.")
    for port in (5077, 4173):
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.4):
                raise RuntimeError(
                    f"Port {port} is already in use; stop the existing service first. "
                    "Never attach a hiring demo to an unknown process."
                )
        except (ConnectionRefusedError, TimeoutError, OSError):
            # Connection refused / timeout: no active local listener is reachable.
            pass


def stop(process: subprocess.Popen[bytes] | None) -> None:
    if process is None or process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=8)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def launch(command: list[str], cwd: Path) -> subprocess.Popen[bytes]:
    # No shell, no background daemon, inherited stdout/stderr and local binding.
    return subprocess.Popen(command, cwd=cwd)


def wait_ready(process: subprocess.Popen[bytes], timeout: float = 60) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("API exited before /ready succeeded. Inspect output above.")
        if is_ready():
            return
        time.sleep(0.5)
    raise RuntimeError(
        "API did not become ready: check disposable PostgreSQL, schema "
        "and ConnectionStrings__Jobs. No successful job is assumed."
    )


def main() -> int:
    if "--help" in sys.argv or "-h" in sys.argv:
        print(__doc__)
        print("Usage: ConnectionStrings__Jobs=... python3 hiring-demo/run.py")
        print("During execution: r = restart API, q = quit.")
        return 0
    check_prerequisites()
    api: subprocess.Popen[bytes] | None = None
    frontend: subprocess.Popen[bytes] | None = None
    try:
        print("Starting real ASP.NET Core API against the configured disposable PostgreSQL...")
        api = launch(api_command(), ROOT)
        wait_ready(api)
        print("PostgreSQL readiness confirmed by GET /ready.")
        frontend = launch(web_command(), FRONTEND)
        time.sleep(1.5)
        if frontend.poll() is not None:
            raise RuntimeError("Frontend exited. Inspect npm/Vite output above.")
        print("\nOPEN: " + FRONTEND_URL)
        print("Submit a task and wait for 'done' before testing restart.")
        print("Commands: r = restart whole API process; q = stop both processes.")
        while True:
            try:
                command = input("hiring-demo> ").strip().lower()
            except (EOFError, KeyboardInterrupt):
                print("Console input closed; shutting down.")
                break
            if command in ("q", "quit", "exit"):
                break
            if command in ("r", "restart"):
                print("Stopping API (React remains running). Watch readiness turn red.")
                stop(api)
                api = None
                time.sleep(5)  # Visible downtime; no simulated health data.
                print("Restarting API using the same durable demo PostgreSQL...")
                api = launch(api_command(), ROOT)
                wait_ready(api)
                print("API is ready again. Repeat POST with the same key in the browser.")
            else:
                print("Use r to restart API, q to quit.")
        return 0
    finally:
        stop(frontend)
        stop(api)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, OSError) as exc:
        print("STARTUP FAILED: " + str(exc), file=sys.stderr)
        raise SystemExit(2) from None
