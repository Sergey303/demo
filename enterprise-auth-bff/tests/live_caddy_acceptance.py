#!/usr/bin/env python3
"""EP-12E: real Caddy TLS -> owner-only Unix socket BFF -> Keycloak and PostgreSQL.

Explicitly CI-only: this reuses EP-12C's *disposable* test IdP, certificates,
database and real browser tests. Caddy and the BFF share a private UID but no
BFF TCP listener is exposed. No production app or external IdP is contacted.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import ssl
import stat
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

import live_oidc_acceptance as c


CADDY_IMAGE = "caddy:2.10.2"
BFF_HOST = "bff.ep12c-app.test:18444"


def probe_uds(path: Path) -> None:
    st = path.lstat()
    if not stat.S_ISSOCK(st.st_mode) or st.st_uid != os.geteuid() or st.st_mode & 0o077:
        raise RuntimeError("BFF Unix socket lacks expected owner-only permissions")
    if stat.S_IMODE(st.st_mode) not in (0o700, 0o600):
        raise RuntimeError("BFF Unix socket mode violates exact owner-only contract")
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
        sock.settimeout(5)
        sock.connect(str(path))
        sock.sendall(("GET /auth/session HTTP/1.1\r\nHost: " + BFF_HOST
                      + "\r\nConnection: close\r\n\r\n").encode("ascii"))
        head = sock.recv(512).decode("ascii", errors="replace").split("\r\n", 1)[0]
    if not head.startswith("HTTP/1.1 400 "):
        raise RuntimeError("Unproxied direct socket HTTP unexpectedly accepted")


def assert_no_tcp_listener(pid: int) -> None:
    output = c.command(["ss", "-ltnp"])
    # The service must have absolutely no TCP listener, not merely no
    # externally published 18444 port. Caddy and Keycloak are other processes.
    if re.search(r"pid=" + str(pid) + r"[,)]", output):
        raise RuntimeError("BFF unexpectedly owns a TCP listening socket")


def trusted_https_sanitization(ca: Path) -> None:
    ctx = ssl.create_default_context(cafile=str(ca))
    url = c.BFF_ORIGIN + "/auth/session"
    for headers in (
        {},
        {"X-Forwarded-Proto": "http", "X-Forwarded-Host": "attacker.invalid"},
        {"X-Forwarded-For": "198.51.100.10", "Forwarded": 'host=attacker.invalid;proto=http'},
        {"X-Original-Host": "attacker.invalid", "X-Forwarded-Prefix": "/evil"},
    ):
        request = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request, context=ctx, timeout=8) as response:
                actual = response.status
        except urllib.error.HTTPError as error:
            actual = error.code
        if actual != 401:
            raise RuntimeError(f"Caddy forwarding sanitation failed (HTTP {actual})")
    # Caddy should not expose an alternate BFF origin for host header attacks.
    request = urllib.request.Request(url, headers={"Host": "attacker.invalid"})
    try:
        with urllib.request.urlopen(request, context=ctx, timeout=8) as response:
            status = response.status
    except urllib.error.HTTPError as error:
        status = error.code
    if status not in (400, 403, 404, 421):
        raise RuntimeError("Caddy accepted unexpected public Host")
    print("Caddy sanitized spoofed forwarding headers and denied wrong Host", flush=True)


def run(tmp: Path, ca: Path, dp_pfx: Path, dp_password: str,
        db: str, db_user: str, db_password: str) -> None:
    suffix = secrets.token_hex(4)
    # A 0700 same-UID socket directory outside /tmp and outside repository.
    # Kestrel rejects sticky writable and untrusted ancestors by design.
    socket_dir = Path.home() / ("ep12e-uds-" + suffix)
    socket_dir.mkdir(mode=0o700)
    uds = socket_dir / "bff.sock"
    caddy_name = "ep12e-caddy-" + suffix
    keycloak_name = "ep12e-keycloak-" + suffix
    caddy_created = False
    keycloak_created = False
    bff = None
    bff_log = None
    try:
        client_secret = secrets.token_hex(32)
        alice_password, bob_password = secrets.token_hex(16), secrets.token_hex(16)
        realm = c.keycloak_realm(tmp, client_secret, alice_password, bob_password)
        c.command([
            "docker", "run", "--detach", "--rm", "--name", keycloak_name,
            "-p", "127.0.0.1:18443:8443",
            "-v", f"{realm}:/opt/keycloak/data/import/ep12c-realm.json:ro",
            "-v", f"{tmp / 'server.crt'}:/opt/keycloak/conf/ep12c.crt:ro",
            "-v", f"{tmp / 'server.key'}:/opt/keycloak/conf/ep12c.key:ro",
            "-e", "KC_BOOTSTRAP_ADMIN_USERNAME=ep12e-test-admin",
            "-e", "KC_BOOTSTRAP_ADMIN_PASSWORD=" + secrets.token_hex(20),
            "quay.io/keycloak/keycloak:26.7.2",
            "start-dev", "--import-realm",
            "--hostname=" + c.AUTHORITY.split("/realms/")[0],
            "--hostname-strict=true", "--https-port=8443", "--http-enabled=false",
            "--https-certificate-file=/opt/keycloak/conf/ep12c.crt",
            "--https-certificate-key-file=/opt/keycloak/conf/ep12c.key",
        ], timeout=240)
        keycloak_created = True
        c.wait_for(c.AUTHORITY + "/.well-known/openid-configuration", ca)
        with urllib.request.urlopen(
            c.AUTHORITY + "/.well-known/openid-configuration",
            context=ssl.create_default_context(cafile=str(ca)), timeout=8,
        ) as response:
            discovery = json.load(response)
        if discovery.get("issuer") != c.AUTHORITY:
            raise RuntimeError("Keycloak issuer mismatch")
        if "S256" not in discovery.get("code_challenge_methods_supported", []):
            raise RuntimeError("Keycloak does not advertise S256")
        print("EP12E Keycloak real HTTPS discovery + PKCE/S256: PASS", flush=True)

        # Use the *repository's own sample*, changing only the fictional
        # hostname, host port, and runtime TLS paths. No alternate proxy recipe.
        sample = (c.ROOT / "enterprise-demo/Caddyfile.ep12d.example").read_text()
        sample = sample.replace(
            "https://bff.example.test {",
            "https://" + BFF_HOST + " {\n    bind 127.0.0.1")
        sample = sample.replace(
            "tls /etc/ep12-edge/tls.crt /etc/ep12-edge/tls.key",
            "tls /certs/server.crt /certs/server.key")
        sample = sample.replace("bff.example.test", BFF_HOST)
        if sample.count("bind 127.0.0.1") != 1 or "bff.example.test" in sample:
            raise RuntimeError("Unrecognized Caddyfile reference configuration")
        caddyfile = tmp / "Caddyfile"
        caddyfile.write_text(sample, encoding="utf-8")
        caddyfile.chmod(0o644)

        # Run Caddy as the *same UID* as BFF, not container root, so its only
        # authorization to connect to the UDS comes from Linux 0700/0700.
        bind_args = [
            "--network", "host", "--user", f"{os.geteuid()}:{os.getegid()}",
            "-e", "XDG_CONFIG_HOME=/tmp/caddy-config",
            "-e", "XDG_DATA_HOME=/tmp/caddy-data",
            "-v", f"{socket_dir}:/run/ep12-bff",
            "-v", f"{caddyfile}:/etc/caddy/Caddyfile:ro",
            "-v", f"{tmp / 'server.crt'}:/certs/server.crt:ro",
            "-v", f"{tmp / 'server.key'}:/certs/server.key:ro",
        ]
        c.command(["docker", "run", "--rm", *bind_args, CADDY_IMAGE,
                   "caddy", "validate", "--config", "/etc/caddy/Caddyfile"], timeout=60)
        print("Repository Caddyfile validated by real Caddy container", flush=True)
        c.command(["docker", "run", "--detach", "--rm", "--name", caddy_name,
                   *bind_args, CADDY_IMAGE, "caddy", "run",
                   "--config", "/etc/caddy/Caddyfile"], timeout=60)
        caddy_created = True
        print("Caddy listening on loopback HTTPS; BFF uses Unix socket only", flush=True)

        env = os.environ.copy()
        # Never inherit an ambient ASP.NET endpoint or forwarded-header switch.
        for key in env:
            uppercase = key.upper()
            if uppercase in (
                "ASPNETCORE_URLS", "URLS", "ASPNETCORE_HTTP_PORTS",
                "ASPNETCORE_HTTPS_PORTS", "DOTNET_URLS", "HTTP_PORTS",
                "HTTPS_PORTS", "LISTEN_FDS", "LISTEN_PID", "LISTEN_FDNAMES",
                "ASPNETCORE_FORWARDEDHEADERS_ENABLED",
            ):
                raise RuntimeError("Unexpected preconfigured host listener environment")
        env.update({
            "ASPNETCORE_ENVIRONMENT": "Production",
            "EP12_TRANSPORT": "trusted-uds-proxy",
            "EP12_PROXY_SOCKET_PATH": str(uds),
            "EP12_AUTHORITY": c.AUTHORITY, "EP12_PUBLIC_ORIGIN": c.BFF_ORIGIN,
            "EP12_CLIENT_ID": "ep12c-bff", "EP12_CLIENT_SECRET": client_secret,
            "EP12_PRINCIPALS": json.dumps([{
                "issuer": c.AUTHORITY, "sub": c.ALICE_SUB,
                "tenant": "ep12c-test", "subject": "alice",
            }]),
            "DEMO_AUTH_SECRET": secrets.token_hex(48),
            "EP12_SESSION_DSN": (
                f"Host=127.0.0.1;Port=5432;Database={db};"
                f"Username={db_user};Password={db_password}"
            ),
            "EP12_DP_KEYS_DIR": str(tmp / "keys"),
            "EP12_DP_CERT_PFX": str(dp_pfx),
            "EP12_DP_CERT_PASSWORD": dp_password,
            "EP12C_LIVE_TEST": "true",
            "EP12C_BFF_ORIGIN": c.BFF_ORIGIN,
            "EP12C_ALICE_PASSWORD": alice_password,
            "EP12C_BOB_PASSWORD": bob_password,
        })
        src = c.ROOT / "enterprise-auth-bff/src"
        bff_log = (tmp / "bff.log").open("w", encoding="utf-8")

        def start_bff() -> subprocess.Popen:
            if uds.exists() or uds.is_symlink():
                raise RuntimeError("Stale UDS socket after BFF shutdown")
            return subprocess.Popen(
                ["dotnet", "bin/Release/net10.0/EnterpriseAuthBff.dll"],
                cwd=src, env=env, stdout=bff_log, stderr=subprocess.STDOUT)

        bff = start_bff()
        c.wait_for(c.BFF_ORIGIN + "/auth/session", ca, expected=401,
                   process=bff, seconds=80)
        probe_uds(uds)
        assert_no_tcp_listener(bff.pid)
        trusted_https_sanitization(ca)
        print("Kestrel AF_UNIX owner-only, no BFF TCP, strict proxy boundary: PASS",
              flush=True)

        def browser_phase(phase: str) -> None:
            env["EP12C_PHASE"] = phase
            output = subprocess.run(
                ["npx", "playwright", "test",
                 "tests/enterprise-oidc-live.spec.ts",
                 "--workers=1", "--retries=0"],
                cwd=c.ROOT / "bootstrap5", env=env, timeout=160,
                check=False,
            )
            if output.returncode:
                raise RuntimeError("Real Caddy+Keycloak browser phase failed: " + phase)

        browser_phase("unmapped_bob")
        bff.terminate()
        bff.wait(timeout=12)
        bff = None
        # The second phase varies only the trusted startup mapping. A live
        # provider login through the exact same TLS edge must now succeed.
        env["EP12_PRINCIPALS"] = json.dumps([
            {"issuer": c.AUTHORITY, "sub": c.ALICE_SUB,
             "tenant": "ep12c-test", "subject": "alice"},
            {"issuer": c.AUTHORITY, "sub": c.BOB_SUB,
             "tenant": "ep12c-test", "subject": "bob"},
        ])
        bff = start_bff()
        c.wait_for(c.BFF_ORIGIN + "/auth/session", ca, expected=401,
                   process=bff, seconds=80)
        probe_uds(uds)
        assert_no_tcp_listener(bff.pid)
        browser_phase("mapped_bob")
        print("EP12E PASS: real cross-site Keycloak -> Caddy HTTPS -> BFF UDS "
              "-> PostgreSQL, cookie revocation and Bob mapping control", flush=True)
    finally:
        if bff is not None:
            bff.terminate()
            try:
                bff.wait(timeout=10)
            except subprocess.TimeoutExpired:
                bff.kill()
                bff.wait(timeout=10)
        if bff_log is not None:
            bff_log.close()
        if caddy_created:
            subprocess.run(["docker", "rm", "-f", caddy_name], capture_output=True,
                           timeout=20)
        if keycloak_created:
            subprocess.run(["docker", "rm", "-f", keycloak_name], capture_output=True,
                           timeout=20)
        # Do not delete foreign or replaced socket files. A crashing BFF
        # requires an operator to inspect unexpected leftovers.
        if not uds.exists() and not uds.is_symlink():
            socket_dir.rmdir()


def main() -> int:
    if (os.environ.get("GITHUB_ACTIONS") != "true" or
        os.environ.get("EP12E_DISPOSABLE_POSTGRES") != "1" or
        not os.environ.get("EP12E_PG_ADMIN_PASSWORD")):
        print("EP12E only accepts explicit disposable GitHub Actions fixture",
              file=sys.stderr)
        return 2
    for executable in ("docker", "openssl", "certutil", "psql", "ss"):
        if not shutil.which(executable):
            print("Missing required test dependency: " + executable, file=sys.stderr)
            return 2
    c.register_isolated_test_domains()
    with tempfile.TemporaryDirectory(prefix="ep12e-", dir="/tmp") as dirname:
        tmp = Path(dirname)
        tmp.chmod(0o700)
        ca_location = None
        suffix = secrets.token_hex(4)
        db, user = "ep12e_" + suffix, "ep12e_user_" + suffix
        try:
            ca, tls_pfx, tls_pass, dp_pfx, dp_pass = c.certs(tmp)
            ca_location = c.trust_local_ca(ca, tmp)
            db_password = c.database(
                os.environ["EP12E_PG_ADMIN_PASSWORD"], db, user)
            run(tmp, ca, dp_pfx, dp_pass, db, user, db_password)
            return 0
        except (RuntimeError, OSError, ValueError, subprocess.TimeoutExpired) as error:
            # Don't print exception objects from subprocess with secret args.
            if isinstance(error, subprocess.TimeoutExpired):
                print("EP12E failure: isolated process timeout", file=sys.stderr)
            else:
                print("EP12E failure: " + str(error)[:210], file=sys.stderr)
            return 1
        finally:
            admin_env = os.environ | {
                "PGPASSWORD": os.environ["EP12E_PG_ADMIN_PASSWORD"]
            }
            subprocess.run(["dropdb", "--if-exists", "--force", "-h", "127.0.0.1",
                            "-p", "5432", "-U", "demo", db], env=admin_env,
                           capture_output=True, timeout=30)
            subprocess.run(["psql", "-X", "-q", "-h", "127.0.0.1", "-p", "5432",
                            "-U", "demo", "-d", "reliable_jobs",
                            "-c", f"DROP ROLE IF EXISTS {user}"],
                           env=admin_env, capture_output=True, timeout=30)
            if ca_location:
                subprocess.run(["sudo", "rm", "-f", str(ca_location)],
                               capture_output=True, timeout=15)
                subprocess.run(["sudo", "update-ca-certificates"],
                               capture_output=True, timeout=45)


if __name__ == "__main__":
    raise SystemExit(main())
