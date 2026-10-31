#!/usr/bin/env python3
"""Optional end-to-end smoke test; requires the local API and PostgreSQL to be running.

No third-party Python dependencies. Proves that simultaneous requests with
the same idempotency key get one job, a changed payload gets 409, and worker
eventually commits a deterministic result.
"""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
import os
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

base = os.environ.get("JOBS_BASE_URL", "http://127.0.0.1:5077")
key = "portfolio-smoke-" + str(uuid4())
text = "alpha beta gamma"
body = json.dumps({"text": text}).encode("utf-8")


def post(data):
    request = Request(
        base + "/jobs",
        data=json.dumps({"text": data}).encode("utf-8"),
        headers={"Content-Type": "application/json", "Idempotency-Key": key},
        method="POST",
    )
    try:
        with urlopen(request, timeout=5) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, json.load(error)


with ThreadPoolExecutor(max_workers=10) as pool:
    submitted = list(pool.map(lambda _: post(text), range(20)))

ids = {result["id"] for status, result in submitted if status in (200, 202)}
assert len(ids) == 1, submitted
assert all(status in (200, 202) for status, _ in submitted), submitted
assert post("different text")[0] == 409, "Same idempotency key with different payload must conflict"
job_id = next(iter(ids))

for _ in range(50):
    with urlopen(base + "/jobs/" + job_id, timeout=5) as response:
        result = json.load(response)
    if result["status"] == "done":
        assert result["result"]["WordCount"] == 3, result
        assert result["result"]["Sha256"] == sha256(text.encode()).hexdigest().upper(), result
        print("PASS concurrent idempotency, 409 conflict, durable worker result", job_id)
        break
    if result["status"] == "failed":
        raise RuntimeError(f"Worker failed unexpectedly: {result}")
    time.sleep(0.2)
else:
    raise TimeoutError("Worker did not finish in 10 seconds")
