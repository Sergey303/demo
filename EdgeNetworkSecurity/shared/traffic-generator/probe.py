"""Strictly bounded loopback-only HTTP probe; never targets public services."""
from __future__ import annotations

import argparse
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

MAX_SCENARIO_BYTES = 10_000
ALLOWED_PATHS = frozenset(("/health", "/api/expensive"))
REQUIRED = frozenset(("id", "target", "durationSeconds", "maxRequestsPerSecond"))
OPTIONAL = frozenset(("trafficProfile",))
MAX_REQUESTS = 600


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def validate_url(url: str) -> str:
    if not isinstance(url, str) or len(url) > 256:
        raise ValueError("invalid URL")
    parts = urlsplit(url)
    if parts.scheme != "http" or parts.hostname not in ("127.0.0.1", "::1"):
        raise ValueError("only literal localhost IPs are permitted")
    try:
        port = parts.port
    except ValueError as exc:
        raise ValueError("invalid port") from exc
    if port is None or port < 1024 or port > 65535:
        raise ValueError("a loopback port in 1024..65535 is required")
    expected_host = "127.0.0.1" if parts.hostname == "127.0.0.1" else "[::1]"
    if (parts.netloc != f"{expected_host}:{port}" or parts.path not in ALLOWED_PATHS
            or parts.query or parts.fragment or parts.username is not None
            or parts.password is not None):
        raise ValueError("unapproved URL component")
    return url


def parse_scenario(source: str) -> dict:
    if not isinstance(source, str) or len(source.encode("utf-8")) > MAX_SCENARIO_BYTES:
        raise ValueError("scenario too large")
    try:
        data = json.loads(source)
    except json.JSONDecodeError as exc:
        raise ValueError("invalid scenario JSON") from exc
    if (not isinstance(data, dict) or not REQUIRED <= data.keys()
            or set(data) - REQUIRED - OPTIONAL):
        raise ValueError("scenario must match the shared schema")
    if not isinstance(data["id"], str) or not 1 <= len(data["id"]) <= 64:
        raise ValueError("invalid scenario ID")
    if any(not (c.isalnum() and c.isascii() or c in "-_") for c in data["id"]):
        raise ValueError("invalid scenario ID")
    if data["target"] != "local":
        raise ValueError("only local target is allowed")
    for field, minimum, maximum in (
            ("durationSeconds", 1, 60), ("maxRequestsPerSecond", 1, 10)):
        value = data[field]
        if type(value) is not int or not minimum <= value <= maximum:
            raise ValueError(f"invalid {field}")
    profile = data.get("trafficProfile", "baseline")
    if profile != "baseline":
        raise ValueError("only baseline profile is implemented; no distributed/burst simulation yet")
    return data


def _percentile(values: list[float], part: float) -> float | None:
    if not values:
        return None
    return round(sorted(values)[max(0, int((len(values) * part + 0.9999999)) - 1)], 3)


def run_probe(scenario_source: str, url: str) -> dict:
    url = validate_url(url)
    scenario = parse_scenario(scenario_source)  # Validate fully before any network activity.
    maximum = scenario["maxRequestsPerSecond"] * scenario["durationSeconds"]
    if maximum > MAX_REQUESTS:
        raise ValueError("too many requests")
    opener = build_opener(ProxyHandler({}), NoRedirect())
    stats: Counter[int] = Counter()
    latencies: list[float] = []
    errors = 0
    start = time.monotonic()
    earliest_next = start
    interval = 1.0 / scenario["maxRequestsPerSecond"]
    try:
        for n in range(maximum):
            scheduled = max(start + n * interval, earliest_next)
            if scheduled >= start + scenario["durationSeconds"]:
                break
            time.sleep(max(0.0, scheduled - time.monotonic()))
            if time.monotonic() >= start + scenario["durationSeconds"]:
                break
            request = Request(url, method="GET", headers={"User-Agent": "local-edge-lab/1"})
            tick = time.monotonic()
            earliest_next = tick + interval
            try:
                with opener.open(request, timeout=1.5) as response:
                    stats[response.status] += 1
                    response.read(4096)
            except HTTPError as exc:
                # Includes redirects: NoRedirect prevents fetching a redirected URL.
                stats[exc.code] += 1
                exc.close()
            except (URLError, TimeoutError, OSError):
                errors += 1
            latencies.append((time.monotonic() - tick) * 1000)
    except KeyboardInterrupt:
        return {"status": "interrupted", "requests_attempted": sum(stats.values()) + errors}
    return {
        "status": "local-tested" if stats and errors == 0 else "incomplete",
        "scenario_id": scenario["id"],
        "scenario_sha256": sha256(scenario_source.encode("utf-8")).hexdigest(),
        "url_kind": "loopback-http",
        "requests_attempted": sum(stats.values()) + errors,
        "responses_by_status": {str(k): v for k, v in sorted(stats.items())},
        "transport_errors": errors,
        "latency_p50_ms": _percentile(latencies, 0.50),
        "latency_p95_ms": _percentile(latencies, 0.95),
        "limits": "max 10 RPS, 60 s, 600 requests; only baseline, sequential loopback GET",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Loopback-only bounded HTTP probe")
    parser.add_argument("--scenario", required=True, type=Path)
    parser.add_argument("--url", required=True, help="Exact http://127.0.0.1:PORT/{health,api/expensive}")
    args = parser.parse_args()
    try:
        validate_url(args.url)
        if args.scenario.stat().st_size > MAX_SCENARIO_BYTES:
            raise ValueError("scenario too large")
        result = run_probe(args.scenario.read_text(encoding="utf-8"), args.url)
    except (OSError, UnicodeError, ValueError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
