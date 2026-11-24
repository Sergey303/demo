"""Run the deterministic refresh race against a fresh disposable PostgreSQL 16."""
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time
import uuid

project = Path(__file__).resolve().parent / "RefreshRotation/RefreshRotation.csproj"
name = "demo-appforge-rotation-" + uuid.uuid4().hex[:10]
password = secrets.token_hex(24)
with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
nested = os.getenv("APPFORGE_TEST_NETWORK_CONTAINER")
if nested not in (None, "rdc-project"):
    raise ValueError("Unsupported nested network")
network = ["--network", "container:rdc-project"] if nested else ["-p", f"127.0.0.1:{port}:5432"]
server = ["-c", "listen_addresses=127.0.0.1", "-p", str(port)] if nested else []
pgport = str(port if nested else 5432)
env = dict(os.environ, POSTGRES_PASSWORD=password, POSTGRES_DB="appforge_rotation_test")
subprocess.run(["docker", "run", "--pull", "never", "-d", "--rm", "--name", name,
                "--memory", "256m", "--cpus", "0.5", *network, "-e", "POSTGRES_PASSWORD",
                "-e", "POSTGRES_DB", "postgres:16", *server], env=env, check=True,
               stdout=subprocess.DEVNULL, timeout=30)
try:
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if subprocess.run(["docker", "exec", name, "pg_isready", "-h", "127.0.0.1", "-p", pgport,
                           "-d", "appforge_rotation_test", "-U", "postgres"],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5).returncode == 0:
            break
        time.sleep(.3)
    else:
        raise RuntimeError("Disposable database not ready")
    env = dict(os.environ, APPFORGE_ROTATION_TEST_CONNECTION=
               f"Host=127.0.0.1;Port={port};Database=appforge_rotation_test;Username=postgres;Password={password}")
    subprocess.run(["dotnet", "run", "--no-build", "--project", str(project), "--", *sys.argv[1:]],
                   env=env, check=True, timeout=60)
finally:
    subprocess.run(["docker", "rm", "-f", name], stdout=subprocess.DEVNULL,
                   stderr=subprocess.DEVNULL, timeout=20)
