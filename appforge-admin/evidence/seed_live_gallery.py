"""Create a few fictitious gallery rows THROUGH the real AppForge HTTP API.

Only for the separately provisioned, disposable local test database. No
credentials, tokens, or real customer data are stored in this repository.
"""
from __future__ import annotations

import json
import os
import uuid
from urllib import request

BASE = os.environ.get("APPFORGE_TEST_BASE", "http://127.0.0.1:55502").rstrip("/")
GALLERY = (
    ("Northwind Studio", "team@northwind.example.test", "Creative", "Website redesign"),
    ("Atlas Services", "office@atlas.example.test", "B2B", "Support contract"),
    ("Oakwood Retail", "ops@oakwood.example.test", "Retail", "Project completed"),
)


def call(method: str, path: str, body=None, token=None, key=None):
    headers = {"Accept": "application/json"}
    if body is not None: headers["Content-Type"] = "application/json"
    if token: headers["Authorization"] = f"Bearer {token}"
    if key: headers["Idempotency-Key"] = key
    data = json.dumps(body).encode() if body is not None else None
    with request.urlopen(request.Request(BASE + path, data=data, headers=headers, method=method), timeout=12) as res:
        blob = res.read()
        return res.status, json.loads(blob) if blob else None


def main():
    from pathlib import Path
    password = Path(os.environ.get("APPFORGE_TEST_SECRET_PATH", "/tmp/appforge-crud-smoke/active-password.txt")).read_text().strip()
    user = os.environ["APPFORGE_ADMIN_EMAIL"]
    status, response = call("POST", "/api/auth/login", {"login": user, "password": password})
    assert status == 200
    token = response["accessToken"]
    _, existing = call("GET", "/api/customers", token=token)
    names = {r["name"] for r in existing["items"]}
    for name, email, segment, note in GALLERY:
        if name in names:
            print("EXISTS", name)
            continue
        st, row = call("POST", "/api/customers", {
            "name": name, "email": email, "note": note, "segment": segment,
        }, token=token, key=str(uuid.uuid4()))
        assert st == 201 and row["name"] == name, (st, row)
        print("CREATED", name)
    st, after = call("GET", "/api/customers", token=token)
    assert st == 200
    assert {r[0] for r in GALLERY}.issubset({row["name"] for row in after["items"]})
    print("LIVE_GALLERY_PASS", len(after["items"]), "real SQL-backed rows")


if __name__ == "__main__":
    main()
