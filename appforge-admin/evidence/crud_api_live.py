"""Real-DB API smoke of generated admin CRUD (no external services).

Target only a disposable, manually prepared database. Requires
APPFORGE_ADMIN_EMAIL/APPFORGE_ADMIN_PASSWORD in the process environment; the
first run changes the mandatory bootstrap password and stores the new password
in /tmp/appforge-crud-smoke (never in git).
"""
from __future__ import annotations

import json
import os
import secrets
import subprocess
import time
import uuid
from pathlib import Path
from urllib import error, request

BASE = os.environ.get("APPFORGE_TEST_BASE", "http://127.0.0.1:55502").rstrip("/")
TEST_DIR = Path("/tmp/appforge-crud-smoke")
ACTIVE_PASS_PATH = Path(os.environ.get("APPFORGE_TEST_SECRET_PATH", TEST_DIR / "active-password.txt"))
EVENTS: list[dict] = []


def call(method: str, path: str, payload=None, token=None, idem=None):
    headers = {"Accept": "application/json"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    if idem:
        headers["Idempotency-Key"] = idem
    data = None if payload is None else json.dumps(payload).encode()
    req = request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=12) as response:
            text = response.read().decode()
            return response.status, json.loads(text) if text else None
    except error.HTTPError as exc:
        text = exc.read().decode()
        try: body = json.loads(text)
        except ValueError: body = text[:300]
        return exc.code, body


def require(code, actual, step, body=None):
    EVENTS.append({"step": step, "expected": code, "actual": actual, "pass": code == actual})
    if code != actual:
        raise AssertionError(f"{step}: expected HTTP {code}, got {actual}: {str(body)[:280]}")


def read_deleted_flag(value: str) -> bool | None:
    # This is a *disposable* DB and a UUID returned by the generated API.
    assert str(uuid.UUID(value)) == value.lower()
    sql = 'SELECT "IsDeleted" FROM "Customers" WHERE "Id" = ' + "'" + value + "';"
    run = subprocess.run([
        "docker", "exec", "appforge-backoffice-crud-pg", "psql", "-qtA",
        "-U", "appforge_smoke", "-d", os.environ.get("APPFORGE_TEST_DB", "business_operations_admin"),
        "-c", sql,
    ], text=True, check=True, capture_output=True)
    return {"t": True, "f": False, "": None}[run.stdout.strip()]


def main():
    assert os.getenv("APPFORGE_ADMIN_EMAIL") and os.getenv("APPFORGE_ADMIN_PASSWORD")
    token = None
    password = ACTIVE_PASS_PATH.read_text().strip() if ACTIVE_PASS_PATH.exists() else os.environ["APPFORGE_ADMIN_PASSWORD"]
    username = os.environ["APPFORGE_ADMIN_EMAIL"]
    code, body = call("POST", "/api/auth/login", {"login": username, "password": password})
    require(200, code, "auth.login", body)
    if body["user"].get("mustChangePassword"):
        new_password = secrets.token_urlsafe(33)
        code2, b2 = call("POST", "/api/auth/change-password",
                         {"currentPassword": password, "newPassword": new_password},
                         token=body["accessToken"])
        require(204, code2, "auth.change_required_password", b2)
        ACTIVE_PASS_PATH.write_text(new_password)
        ACTIVE_PASS_PATH.chmod(0o600)
        password = new_password
        code, body = call("POST", "/api/auth/login", {"login": username, "password": password})
        require(200, code, "auth.login_after_password_change", body)
    assert body["user"]["mustChangePassword"] is False, "admin still requires password change"
    token = body["accessToken"]
    code, noauth = call("GET", "/api/customers")
    require(403, code, "auth.reject_anonymous_forbidden", noauth)

    name = "Synthetic Northwind " + uuid.uuid4().hex[:7]
    record = {"name": name, "email": "northwind@example.test", "segment": "Services",
              "note": "Generated backoffice live API"}
    key = str(uuid.uuid4())
    code, created = call("POST", "/api/customers", record, token, key)
    require(201, code, "customer.create", created)
    cust_id = created["id"]
    assert created["name"] == name, created
    assert read_deleted_flag(cust_id) is False, "created record absent or soft-deleted in PostgreSQL"

    code, replay = call("POST", "/api/customers", record, token, key)
    require(201, code, "customer.idempotent_create_replay", replay)
    assert replay["id"] == cust_id

    code, got = call("GET", "/api/customers/" + cust_id, token=token)
    require(200, code, "customer.read", got)
    assert got["name"] == name

    code, listed = call("GET", "/api/customers", token=token)
    require(200, code, "customer.list", listed)
    assert any(x["id"] == cust_id for x in listed["items"]), "created item absent from list"

    edit = dict(record, name="Synthetic Northwind Revised", note="Updated with real HTTP")
    code, changed = call("PUT", "/api/customers/" + cust_id, edit, token, str(uuid.uuid4()))
    require(200, code, "customer.update", changed)
    assert changed["name"] == edit["name"]

    code, got2 = call("GET", "/api/customers/" + cust_id, token=token)
    require(200, code, "customer.read_after_update", got2)
    assert got2["name"] == edit["name"]

    code, removed = call("DELETE", "/api/customers/" + cust_id, token=token, idem=str(uuid.uuid4()))
    require(204, code, "customer.delete", removed)
    assert read_deleted_flag(cust_id) is True, "soft-delete marker was not persisted in PostgreSQL"
    code, final = call("GET", "/api/customers/" + cust_id, token=token)
    require(404, code, "customer.read_after_delete", final)

    output = {"status": "PASS", "kind": "live-http-postgres",
              "model": "Business Operations Admin", "steps": EVENTS,
              "database_direct_check": "created row was active; after delete its IsDeleted marker is true",
              "auth": "temporary bootstrap password rotated via generated API",
              "restrictions": "disposable database; no browser E2E implied",
              "time_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    out = TEST_DIR / "api-evidence.json"
    out.write_text(json.dumps(output, indent=2) + "\n")
    print("LIVE_API_CRUD_PASS", len(EVENTS), "HTTP assertions, direct SQL create/delete verification")
    print("Evidence:", str(out))


if __name__ == "__main__":
    main()
