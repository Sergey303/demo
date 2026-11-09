#!/usr/bin/env python3
"""Offline link and stale-status guard for employer agent review entrypoints.

Verifies only Markdown link targets and known historical false claims. It does
NOT imply a feature was integrated, a model ran, or a hiring decision is sound.
"""
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DOCS = (
    "README.md",
    "AGENTS.md",
    "AI-CAPABILITIES.md",
    "architecture/README.md",
    "architecture/ENTERPRISE-AI-PLATFORM-PLAN.md",
    "architecture/adr/003-retrieval-quality-cost.md",
    "python-ai/README.md",
)
LINKS = re.compile(r"!?(?:\[[^\]]*\])\(([^)]+)\)")
STALE = (
    "PLAN / единый продукт не реализован",
    "GitHub Actions has not been enabled",
    "All projects are standalone.",
)


def check() -> list[str]:
    failures = []
    for name in DOCS:
        source = ROOT / name
        if not source.is_file():
            failures.append(f"{name}: entrypoint missing")
            continue
        body = source.read_text(encoding="utf-8")
        for phrase in STALE:
            if phrase in body:
                failures.append(f"{name}: stale status assertion {phrase!r}")
        for target in LINKS.findall(body):
            url = urlsplit(target.split(" ", 1)[0].strip("<>"))
            if url.scheme or url.netloc or not url.path:
                continue
            resolved = (source.parent / unquote(url.path)).resolve()
            if not resolved.is_relative_to(ROOT) or not resolved.exists():
                failures.append(f"{name}: broken relative link {target!r}")
    return failures


if __name__ == "__main__":
    errors = check()
    if errors:
        for error in errors:
            print("ERROR:", error, file=sys.stderr)
        raise SystemExit(1)
    print(f"OK: links and key statuses checked across {len(DOCS)} review documents.")
