#!/usr/bin/env python3
"""Opt-in LOCAL Enterprise AI demo. Does not create or migrate databases."""
from __future__ import annotations

import importlib.util
import os
import shlex
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
API = "http://127.0.0.1:5077"
SEARCH = "http://127.0.0.1:5088"
WEB = "http://127.0.0.1:4173"
FRONTEND = ROOT / "bootstrap5"
PROJECT = ROOT / "dotnet-outbox" / "src" / "ReliableJobs.csproj"
WORKER = ROOT / "architecture" / "audio_worker.py"
SEARCH_APP = ROOT / "architecture" / "search_api.py"


def is_http_ready(url: str) -> bool:
    try:
        with urlopen(url, timeout=2) as response:
            return response.status == 200
    except (OSError, HTTPError, URLError, TimeoutError):
        return False


def check_port_free(port: int) -> None:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.4):
            raise RuntimeError(f"Port {port} is in use. Stop that service first; never reuse unknown processes.")
    except (ConnectionRefusedError, TimeoutError, OSError):
        pass


def parse_npgsql(dsn: str) -> dict[str, str]:
    """Only a narrow explicit demo DSN is supported; never guess the database."""
    try:
        fields = [part.strip().split("=", 1) for part in dsn.split(";") if part.strip()]
        if any(len(field) != 2 for field in fields):
            return {}
        return {k.strip().lower(): v.strip() for k, v in fields}
    except (AttributeError, ValueError):
        return {}


def parse_libpq(dsn: str) -> dict[str, str]:
    try:
        fields = [part.split("=", 1) for part in shlex.split(dsn)]
        if any(len(field) != 2 for field in fields):
            return {}
        return {k.strip().lower(): v.strip() for k, v in fields}
    except (ValueError, AttributeError):
        return {}


def check_environment() -> None:
    net = parse_npgsql(os.environ.get("ConnectionStrings__Jobs", ""))
    py = parse_libpq(os.environ.get("JOBS_TEST_CONNECTION", ""))
    secret = os.environ.get("DEMO_AUTH_SECRET", "")
    if net.get("database") != "reliable_jobs":
        raise RuntimeError("Set ConnectionStrings__Jobs for the isolated reliable_jobs demo database (Npgsql syntax).")
    if py.get("dbname", py.get("database")) != "reliable_jobs":
        raise RuntimeError("Set JOBS_TEST_CONNECTION for isolated reliable_jobs demo DB (libpq syntax).")
    net_host = net.get("host", "").lower().replace("localhost", "127.0.0.1")
    py_host = py.get("host", "").lower().replace("localhost", "127.0.0.1")
    if not net_host or not py_host or (net_host, net.get("port", "5432")) != (py_host, py.get("port", "5432")):
        raise RuntimeError("The two demo DSNs must point to the same PostgreSQL host and port.")
    if len(secret.encode("utf-8")) < 32:
        raise RuntimeError("DEMO_AUTH_SECRET must be >=32 UTF-8 bytes; keep the same value for API and Vite.")
    for cmd in ("dotnet", "node", "npm"):
        if not shutil.which(cmd):
            raise RuntimeError(f"Missing {cmd} executable.")
    for module in ("psycopg", "faster_whisper", "fastembed", "fastapi", "uvicorn"):
        if importlib.util.find_spec(module) is None:
            raise RuntimeError(f"Missing Python dependency {module}; install architecture/audio-requirements.txt.")
    if not (FRONTEND / "node_modules").is_dir():
        raise RuntimeError("Run 'cd bootstrap5 && npm ci' before launching. No automatic downloads.")
    if not PROJECT.is_file() or not WORKER.is_file() or not SEARCH_APP.is_file():
        raise RuntimeError("Incomplete checkout: .NET API and audio_worker.py are required.")
    for port in (5077, 5088, 4173):
        check_port_free(port)


def check_schema() -> None:
    """Read-only check of the disposable DB; never automatically apply migrations."""
    import psycopg

    try:
        with psycopg.connect(os.environ["JOBS_TEST_CONNECTION"], connect_timeout=4) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                      to_regclass('public.jobs') IS NOT NULL,
                      to_regclass('public.outbox') IS NOT NULL,
                      to_regclass('public.audio_read_grants') IS NOT NULL,
                      EXISTS(SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='jobs' AND column_name='kind'),
                      EXISTS(SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='jobs' AND column_name='audio_payload'),
                      EXISTS(SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='jobs' AND column_name='tenant_id'),
                      EXISTS(SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='outbox' AND column_name='lease_token'),
                      EXISTS(SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='outbox' AND column_name='lease_until'),
                      EXISTS(SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='jobs' AND column_name='document_name')
                """)
                columns = cur.fetchone()
                if not columns or not all(columns):
                    raise RuntimeError("Demo DB schema incomplete: apply migrations 001–005 manually first.")
    except psycopg.Error as exc:
        raise RuntimeError("Cannot connect to isolated PostgreSQL with JOBS_TEST_CONNECTION.") from exc


def process_commands() -> list[tuple[str, list[str], Path]]:
    return [
        ("API", ["dotnet", "run", "--project", str(PROJECT), "--urls", API], ROOT),
        ("AI media worker", [sys.executable, str(WORKER), "worker"], ROOT),
        ("Search API", [sys.executable, str(SEARCH_APP)], ROOT),
        ("React", ["npm", "run", "dev", "--", "--host", "127.0.0.1",
                   "--port", "4173", "--strictPort"], FRONTEND),
    ]


def start(name: str, command: list[str], cwd: Path) -> subprocess.Popen:
    print(f"Starting {name}...", flush=True)
    return subprocess.Popen(command, cwd=cwd, start_new_session=(os.name == "posix"))


def stop_owned(process: subprocess.Popen | None) -> None:
    if process is None or process.poll() is not None:
        return
    try:
        if os.name == "posix":
            os.killpg(process.pid, signal.SIGTERM)
        else:
            process.terminate()
        process.wait(timeout=6)
    except (ProcessLookupError, OSError, subprocess.TimeoutExpired):
        if process.poll() is None:
            if os.name == "posix":
                os.killpg(process.pid, signal.SIGKILL)
            else:
                process.kill()
            process.wait(timeout=4)


def wait_for(url: str, proc: subprocess.Popen, name: str, deadline: float = 90) -> None:
    expires = time.monotonic() + deadline
    while time.monotonic() < expires:
        if proc.poll() is not None:
            raise RuntimeError(f"{name} exited (code {proc.returncode}) before readiness.")
        if is_http_ready(url):
            return
        time.sleep(0.5)
    raise RuntimeError(f"{name} did not become ready. Inspect service logs.")


def main() -> int:
    owned: list[subprocess.Popen] = []
    try:
        check_environment()
        check_schema()
        for name, command, cwd in process_commands():
            proc = start(name, command, cwd)
            owned.append(proc)
            if name == "API":
                wait_for(API + "/ready", proc, name)
            if name == "Search API":
                wait_for(SEARCH + "/ready", proc, name)
            if name == "React":
                wait_for(WEB + "/dashboard/enterprise-ai", proc, name)
        print("Open " + WEB + "/dashboard/enterprise-ai", flush=True)
        print("Readiness checks API/DB only, NOT AI model inference or answer quality.", flush=True)
        while True:
            for proc, spec in zip(owned, process_commands()):
                if proc.poll() is not None:
                    raise RuntimeError(f"{spec[0]} exited (code {proc.returncode}).")
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping owned demo processes.", flush=True)
        return 0
    except (RuntimeError, OSError) as exc:
        print("Enterprise demo failed: " + str(exc), file=sys.stderr)
        return 1
    finally:
        for proc in reversed(owned):
            stop_owned(proc)


if __name__ == "__main__":
    raise SystemExit(main())
