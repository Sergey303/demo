"""Dependency-free shape check. Not a substitute for live CRUD or auth tests."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "generated"
RESOURCES = {
    "customers": "Customers",
    "servicerequests": "Servicerequests",
    "workitems": "Workitems",
}


def verify_resource(domain: str, entity: str) -> None:
    contract_path = OUT / "backend-contract" / domain / "endpoints.json"
    contract = json.loads(contract_path.read_text(encoding="utf-8"))
    routes = {(ep["HttpMethod"], ep["RouteTemplate"]) for ep in contract["Endpoints"]}
    prefix = f"/api/{domain}"
    assert ("GET", prefix) in routes, (domain, "list missing")
    assert ("POST", prefix) in routes, (domain, "create missing")
    assert any(verb == "PUT" and path.startswith(prefix + "/") for verb, path in routes), domain
    assert any(verb == "DELETE" and path.startswith(prefix + "/") for verb, path in routes), domain
    page = OUT / "frontend-app/src/generated-ts" / domain / "pages" / f"{entity}Page.generated.tsx"
    assert page.is_file(), page
    source = page.read_text(encoding="utf-8")
    assert f"function {entity}Page" in source, page
    print(f"OK: {domain}: typed CRUD contract + generated React page")


def main() -> None:
    for domain, entity in RESOURCES.items():
        verify_resource(domain, entity)
    assert (OUT / "backend/Migrations/AppForgeGeneratedMigrations.idempotent.sql").is_file()
    manifest = json.loads((OUT / "manifest/package-manifest.json").read_text(encoding="utf-8"))
    assert manifest["generatedIdentity"]["modelId"] == "Business Operations Admin"
    print("OK: model identity + EF migration SQL")


if __name__ == "__main__":
    main()
