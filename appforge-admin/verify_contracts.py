"""Fast, dependency-free source/contract check for the generated 80/20 demo.

This checks that the generated contract exposes the three intended CRUD
resources and that matching UI pages exist. It is *not* a runtime/E2E test.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "generated"
RESOURCE_NAMES = {"subscribers": "Subscribers", "leads": "Leads", "campaigns": "Campaigns"}


def verify_resource(domain: str, entity: str) -> None:
    contract = json.loads((OUT / "backend-contract" / domain / "endpoints.json").read_text(encoding="utf-8"))
    routes = {(item["HttpMethod"], item["RouteTemplate"]) for item in contract["Endpoints"]}
    expected = {("GET", f"/api/{domain}"), ("POST", f"/api/{domain}")}
    assert expected <= routes, (domain, expected - routes)
    methods = {verb for verb, path in routes if path.startswith(f"/api/{domain}")}
    assert {"GET", "POST", "PUT", "DELETE"} <= methods, (domain, methods)
    page = OUT / "frontend-app" / "src" / "generated-ts" / domain / "pages" / f"{entity}Page.generated.tsx"
    assert page.is_file(), page
    text = page.read_text(encoding="utf-8")
    assert f"function {entity}Page" in text, page


def main() -> None:
    for domain, entity in RESOURCE_NAMES.items():
        verify_resource(domain, entity)
        print(f"OK: {domain} CRUD contract + generated React page")
    migr = OUT / "backend" / "Migrations" / "AppForgeGeneratedMigrations.idempotent.sql"
    assert migr.is_file(), migr
    print("OK: idempotent EF migration SQL present")


if __name__ == "__main__":
    main()
