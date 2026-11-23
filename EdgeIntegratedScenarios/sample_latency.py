"""Sample loopback /api/expensive time to response headers using only stdlib."""
import argparse
from collections import Counter
import http.client
import json
import math
import time


def sample(port: int, rps: int, seconds: int) -> dict:
    if not (1 <= port <= 65535 and 1 <= rps <= 10 and 1 <= seconds <= 60):
        raise ValueError("expected port 1..65535, RPS 1..10 and duration 1..60 seconds")
    statuses = Counter()
    transport_failures = 0
    successful_ms = []
    deadline = time.monotonic() + seconds
    next_start = time.monotonic()
    for _ in range(rps * seconds):
        time.sleep(max(0, next_start - time.monotonic()))
        started = time.monotonic()
        if started >= deadline:
            break
        next_start = started + 1 / rps
        connection = http.client.HTTPConnection("127.0.0.1", port, timeout=min(2, deadline - started))
        try:
            connection.request("GET", "/api/expensive", headers={"Connection": "close"})
            with connection.getresponse() as response:
                statuses[response.status] += 1
                if response.status == 200:
                    successful_ms.append((time.monotonic() - started) * 1000)
        except (OSError, http.client.HTTPException):
            transport_failures += 1
        finally:
            connection.close()

    successful_ms.sort()
    http_failures = sum(count for status, count in statuses.items() if status != 200)
    return {
        "status_counts": dict(statuses),
        "http_failures": http_failures,
        "transport_failures": transport_failures,
        "successful_samples": len(successful_ms),
        "http_200_headers_ms": {
            f"p{percentile}": (
                round(successful_ms[math.ceil(len(successful_ms) * percentile / 100) - 1], 2)
                if successful_ms else None
            )
            for percentile in (50, 95, 99)
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--rps", type=int, choices=range(1, 11), default=1, metavar="1..10")
    parser.add_argument("--seconds", type=int, choices=range(1, 61), default=5, metavar="1..60")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("--port must be in 1..65535")
    print(json.dumps(sample(args.port, args.rps, args.seconds), sort_keys=True))


if __name__ == "__main__":
    main()
