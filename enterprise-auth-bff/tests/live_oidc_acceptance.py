#!/usr/bin/env python3
"""Opt-in, disposable *real* Keycloak + TLS + BFF + Chromium acceptance.

Only for explicitly authorized ephemeral CI infrastructure. Never uses a production
IdP, live account, user records, shared job database or the development Vite proxy.
"""
from __future__ import annotations

import json
import os
import secrets
import shutil
import ssl
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUTHORITY = "https://localhost:18443/realms/ep12c"
BFF_ORIGIN = "https://localhost:18444"
ALICE_SUB = "32c47cbf-8fcf-423f-a46d-d8fe88f9a531"
BOB_SUB = "72d47cbf-8fcf-423f-a46d-d8fe88f9a532"


def command(args: list[str], *, env: dict[str, str] | None = None,
            cwd: Path | None = None, timeout: int = 180) -> str:
    result = subprocess.run(args, env=env, cwd=cwd, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            timeout=timeout, check=False)
    if result.returncode:
        # Never echo command arguments, environment, token or provider stdout:
        # PostgreSQL commands and imported realm data can contain secrets.
        raise RuntimeError(f"{Path(args[0]).name} failed (exit {result.returncode})")
    return result.stdout


def wait_for(url: str, ca: Path, *, expected: int = 200,
             process: subprocess.Popen | None = None, seconds: int = 210) -> None:
    context = ssl.create_default_context(cafile=str(ca))
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if process is not None and process.poll() is not None:
            raise RuntimeError("BFF exited before HTTPS became ready")
        try:
            with urllib.request.urlopen(url, context=context, timeout=3) as response:
                if response.status == expected:
                    return
        except urllib.error.HTTPError as error:
            if error.code == expected:
                return
        except (OSError, TimeoutError):
            pass
        time.sleep(2)
    raise RuntimeError(f"HTTPS endpoint did not reach HTTP {expected} after startup")


def certs(tmp: Path) -> tuple[Path, Path, str, Path, str]:
    ca = tmp / "ca.crt"
    command(["openssl", "req", "-x509", "-newkey", "rsa:3072", "-nodes",
             "-keyout", str(tmp / "ca.key"), "-out", str(ca), "-days", "2",
             "-subj", "/CN=EP12C Ephemeral Test Root",
             "-addext", "basicConstraints=critical,CA:TRUE",
             "-addext", "keyUsage=critical,keyCertSign,cRLSign"])
    command(["openssl", "req", "-new", "-newkey", "rsa:2048", "-nodes",
             "-keyout", str(tmp / "server.key"), "-out", str(tmp / "server.csr"),
             "-subj", "/CN=localhost"])
    extensions = tmp / "tls.ext"
    extensions.write_text(
        "subjectAltName=DNS:localhost,IP:127.0.0.1\n"
        "basicConstraints=critical,CA:FALSE\n"
        "keyUsage=critical,digitalSignature,keyEncipherment\n"
        "extendedKeyUsage=serverAuth\n", encoding="utf-8")
    command(["openssl", "x509", "-req", "-in", str(tmp / "server.csr"),
             "-CA", str(ca), "-CAkey", str(tmp / "ca.key"), "-CAcreateserial",
             "-out", str(tmp / "server.crt"), "-days", "2", "-sha256",
             "-extfile", str(extensions)])
    tls_password = secrets.token_hex(24)
    tls_pfx = tmp / "tls.pfx"
    command(["openssl", "pkcs12", "-export",
             "-in", str(tmp / "server.crt"), "-inkey", str(tmp / "server.key"),
             "-certfile", str(ca), "-out", str(tls_pfx),
             "-passout", "pass:" + tls_password])
    tls_pfx.chmod(0o600)

    command(["openssl", "req", "-x509", "-newkey", "rsa:3072", "-nodes",
             "-keyout", str(tmp / "wrap.key"), "-out", str(tmp / "wrap.crt"),
             "-days", "2", "-subj", "/CN=EP12C Ephemeral DataProtection"])
    dp_password = secrets.token_hex(24)
    dp_pfx = tmp / "wrap.pfx"
    command(["openssl", "pkcs12", "-export", "-inkey", str(tmp / "wrap.key"),
             "-in", str(tmp / "wrap.crt"), "-out", str(dp_pfx),
             "-passout", "pass:" + dp_password])
    dp_pfx.chmod(0o600)
    keys = tmp / "keys"
    keys.mkdir(mode=0o700)
    return ca, tls_pfx, tls_password, dp_pfx, dp_password


def trust_local_ca(ca: Path, tmp: Path) -> Path:
    # The CI runner is dedicated and discarded after the job. Chromium M146+
    # uses the newer NSS DB; older builds may still use ~/.pki/nssdb.
    installed = Path("/usr/local/share/ca-certificates") / (
        "ep12c-" + tmp.name + ".crt")
    command(["sudo", "cp", str(ca), str(installed)])
    command(["sudo", "update-ca-certificates"], timeout=90)
    for db in (Path.home() / ".pki/nssdb", Path.home() / ".local/share/pki/nssdb"):
        db.mkdir(mode=0o700, parents=True, exist_ok=True)
        if not (db / "cert9.db").is_file():
            command(["certutil", "-d", "sql:" + str(db), "-N", "--empty-password"])
        command(["certutil", "-d", "sql:" + str(db), "-A",
                 "-n", "EP12C-" + tmp.name, "-t", "C,,", "-i", str(ca)])
    return installed


def database(tmp: Path, admin_password: str) -> tuple[str, str, str]:
    # This job has its own disposable postgres:16-alpine service on loopback.
    suffix = secrets.token_hex(4)
    db, user = "ep12c_" + suffix, "ep12c_user_" + suffix
    password = secrets.token_hex(24)
    env = os.environ | {"PGPASSWORD": admin_password}

    def psql(*args: str, target_db: str = "reliable_jobs") -> None:
        command(["psql", "-X", "-q", "-h", "127.0.0.1", "-p", "5432",
                 "-U", "demo", "-d", target_db, "-v", "ON_ERROR_STOP=1",
                 *args], env=env)

    psql("-c", f"CREATE ROLE {user} LOGIN PASSWORD '{password}'")
    command(["createdb", "-h", "127.0.0.1", "-p", "5432", "-U", "demo", db], env=env)
    psql("-f", str(ROOT / "enterprise-auth-bff/sql/001_sessions.sql"), target_db=db)
    psql("-c", f"REVOKE CREATE ON SCHEMA public FROM PUBLIC; "
               f"GRANT CONNECT ON DATABASE {db} TO {user}; "
               f"GRANT USAGE ON SCHEMA public TO {user}; "
               f"GRANT SELECT,INSERT,UPDATE ON ep12_bff_sessions TO {user}; "
               f"GRANT SELECT,INSERT ON ep12_bff_session_audit TO {user}; "
               f"GRANT USAGE,SELECT ON SEQUENCE ep12_bff_session_audit_event_id_seq TO {user};",
         target_db=db)
    return db, user, password


def keycloak_realm(tmp: Path, client_secret: str, alice_password: str,
                   bob_password: str) -> Path:
    realm = {
        "realm": "ep12c", "enabled": True, "sslRequired": "external",
        "registrationAllowed": False, "loginWithEmailAllowed": False,
        "verifyEmail": False, "resetPasswordAllowed": False,
        "clients": [{
            "clientId": "ep12c-bff", "enabled": True, "protocol": "openid-connect",
            "publicClient": False, "secret": client_secret,
            "standardFlowEnabled": True, "directAccessGrantsEnabled": False,
            "implicitFlowEnabled": False,
            "redirectUris": [BFF_ORIGIN + "/signin-oidc"],
            "webOrigins": [],
            "attributes": {"pkce.code.challenge.method": "S256"},
        }],
        "users": [
            {"id": ALICE_SUB, "username": "alice", "enabled": True,
             "emailVerified": True,
             "credentials": [{"type": "password", "value": alice_password,
                              "temporary": False}]},
            {"id": BOB_SUB, "username": "bob", "enabled": True,
             "emailVerified": True,
             "credentials": [{"type": "password", "value": bob_password,
                              "temporary": False}]}
        ],
    }
    filename = tmp / "ep12c-realm.json"
    filename.write_text(json.dumps(realm), encoding="utf-8")
    filename.chmod(0o644)  # Read-only bind mount for the isolated Keycloak UID
    return filename


def run_acceptance(tmp: Path, ca: Path, tls_pfx: Path, tls_password: str,
                   dp_pfx: Path, dp_password: str,
                   db: str, db_user: str, db_password: str) -> None:
    client_secret = secrets.token_hex(32)
    alice_password, bob_password = secrets.token_hex(16), secrets.token_hex(16)
    kc_realm = keycloak_realm(tmp, client_secret, alice_password, bob_password)
    name = "ep12c-keycloak-" + secrets.token_hex(4)
    bff = None
    bff_log = None
    try:
        command([
            "docker", "run", "--detach", "--rm", "--name", name,
            "-p", "127.0.0.1:18443:8443",
            "-v", f"{kc_realm}:/opt/keycloak/data/import/ep12c-realm.json:ro",
            "-v", f"{tmp / 'server.crt'}:/opt/keycloak/conf/ep12c.crt:ro",
            "-v", f"{tmp / 'server.key'}:/opt/keycloak/conf/ep12c.key:ro",
            "-e", "KC_BOOTSTRAP_ADMIN_USERNAME=ep12c-test-admin",
            "-e", "KC_BOOTSTRAP_ADMIN_PASSWORD=" + secrets.token_hex(20),
            "quay.io/keycloak/keycloak:26.7.2",
            "start-dev", "--import-realm", "--hostname=" + "https://localhost:18443",
            "--hostname-strict=true", "--https-port=8443", "--http-enabled=false",
            "--https-certificate-file=/opt/keycloak/conf/ep12c.crt",
            "--https-certificate-key-file=/opt/keycloak/conf/ep12c.key",
        ], timeout=240)
        print("Keycloak container started; checking genuine HTTPS discovery", flush=True)
        wait_for(AUTHORITY + "/.well-known/openid-configuration", ca)
        with urllib.request.urlopen(AUTHORITY + "/.well-known/openid-configuration",
                                    context=ssl.create_default_context(cafile=str(ca)), timeout=8) as response:
            discovery = json.load(response)
        if discovery.get("issuer") != AUTHORITY:
            raise RuntimeError("Keycloak OIDC discovery issuer mismatch")
        if "S256" not in discovery.get("code_challenge_methods_supported", []):
            raise RuntimeError("Provider missing advertised S256 PKCE")
        print("Keycloak issuer and S256 discovery verified over trusted TLS", flush=True)

        env = os.environ.copy()
        env.update({
            "ASPNETCORE_ENVIRONMENT": "Production",
            "ASPNETCORE_URLS": BFF_ORIGIN,
            "ASPNETCORE_Kestrel__Certificates__Default__Path": str(tls_pfx),
            "ASPNETCORE_Kestrel__Certificates__Default__Password": tls_password,
            "EP12_AUTHORITY": AUTHORITY, "EP12_PUBLIC_ORIGIN": BFF_ORIGIN,
            "EP12_CLIENT_ID": "ep12c-bff", "EP12_CLIENT_SECRET": client_secret,
            "EP12_PRINCIPALS": json.dumps([{
                "issuer": AUTHORITY, "sub": ALICE_SUB,
                "tenant": "ep12c-test", "subject": "alice"
            }]),
            "DEMO_AUTH_SECRET": secrets.token_hex(48),
            "EP12_SESSION_DSN": (f"Host=127.0.0.1;Port=5432;Database={db};"
                                 f"Username={db_user};Password={db_password}"),
            "EP12_DP_KEYS_DIR": str(tmp / "keys"),
            "EP12_DP_CERT_PFX": str(dp_pfx),
            "EP12_DP_CERT_PASSWORD": dp_password,
            "NODE_EXTRA_CA_CERTS": str(ca),
            "EP12C_LIVE_TEST": "true",
            "EP12C_BFF_ORIGIN": BFF_ORIGIN,
            "EP12C_ALICE_PASSWORD": alice_password,
            "EP12C_BOB_PASSWORD": bob_password,
        })
        src = ROOT / "enterprise-auth-bff/src"
        bff_log = (tmp / "bff.log").open("w", encoding="utf-8")
        bff = subprocess.Popen(
            ["dotnet", "bin/Release/net10.0/EnterpriseAuthBff.dll"],
            cwd=src, env=env, stdout=bff_log, stderr=subprocess.STDOUT)
        wait_for(BFF_ORIGIN + "/auth/session", ca, expected=401, process=bff, seconds=70)
        print("BFF running with real HTTPS and protected PostgreSQL session registry", flush=True)
        output = command(["npx", "playwright", "test",
                          "tests/enterprise-oidc-live.spec.ts",
                          "--workers=1", "--retries=0"],
                         cwd=ROOT / "bootstrap5", env=env, timeout=150)
        print(output[-3500:], flush=True)
    finally:
        if bff is not None:
            bff.terminate()
            try:
                bff.wait(timeout=8)
            except subprocess.TimeoutExpired:
                bff.kill()
                bff.wait(timeout=8)
        if bff_log is not None:
            bff_log.close()
        # Only the uniquely named container created by this test is removed.
        subprocess.run(["docker", "rm", "-f", name], capture_output=True, timeout=15)


def main() -> int:
    if (os.environ.get("EP12C_DISPOSABLE_POSTGRES") != "1" or
            not os.environ.get("EP12C_PG_ADMIN_PASSWORD")):
        print("Refusing to modify PostgreSQL without an explicit disposable test opt-in.", file=sys.stderr)
        return 2
    if not os.environ.get("GITHUB_ACTIONS") == "true":
        print("This acceptance harness is restricted to isolated GitHub Actions runners.", file=sys.stderr)
        return 2
    if not shutil.which("docker") or not shutil.which("openssl") or not shutil.which("certutil"):
        print("Missing isolated Keycloak/TLS certificate prerequisites.", file=sys.stderr)
        return 2
    with tempfile.TemporaryDirectory(prefix="ep12c-", dir="/tmp") as directory:
        tmp = Path(directory)
        tmp.chmod(0o700)
        ca_location = None
        db = user = None
        try:
            ca, tls_pfx, tls_password, dp_pfx, dp_password = certs(tmp)
            ca_location = trust_local_ca(ca, tmp)
            db, user, db_password = database(tmp, os.environ["EP12C_PG_ADMIN_PASSWORD"])
            run_acceptance(tmp, ca, tls_pfx, tls_password, dp_pfx,
                           dp_password, db, user, db_password)
            print("EP12C PASS: real Keycloak OIDC/PKCE and Chromium HTTPS cookie revocation", flush=True)
            return 0
        except (RuntimeError, subprocess.TimeoutExpired, OSError, ValueError) as error:
            # Only failure type: no secrets from IdP, command args or cookie logs.
            print(f"EP12C FAIL: {type(error).__name__}: {str(error)[:250]}", file=sys.stderr)
            return 1
        finally:
            admin_password = os.environ["EP12C_PG_ADMIN_PASSWORD"]
            env = os.environ | {"PGPASSWORD": admin_password}
            if db:
                subprocess.run(["dropdb", "--if-exists", "--force",
                                "-h", "127.0.0.1", "-p", "5432",
                                "-U", "demo", db], env=env, capture_output=True)
            if user:
                subprocess.run(["psql", "-X", "-q", "-h", "127.0.0.1",
                                "-p", "5432", "-U", "demo", "-d", "reliable_jobs",
                                "-c", f"DROP ROLE IF EXISTS {user}"],
                               env=env, capture_output=True)
            if ca_location:
                subprocess.run(["sudo", "rm", "-f", str(ca_location)], capture_output=True)
                subprocess.run(["sudo", "update-ca-certificates"], capture_output=True)


if __name__ == "__main__":
    raise SystemExit(main())
