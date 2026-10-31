#!/usr/bin/env python3
"""End-to-end HTTP benchmark: distinct idempotency keys, completion and latency.
No third-party dependencies. Disposable demo database only; not a production capacity claim.
"""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from statistics import median
from time import monotonic, sleep
from urllib.request import Request, urlopen
from uuid import uuid4
import argparse
import json


def percentile(values, fraction):
    ordered = sorted(values)
    return ordered[max(0, min(len(ordered)-1, int((len(ordered)-1)*fraction + .5)))]


def run(base, count, concurrency):
    prefix = str(uuid4())
    def submit(i):
        content = f"portfolio job {prefix} {i}"
        req = Request(base + '/jobs', data=json.dumps({'text': content}).encode(),
                      headers={'Content-Type':'application/json','Idempotency-Key':f'{prefix}-{i}'}, method='POST')
        started = monotonic()
        with urlopen(req, timeout=15) as response:
            payload = json.load(response)
            assert response.status == 202, (response.status, payload)
        return payload['id'], content, (monotonic()-started)*1000

    start = monotonic()
    with ThreadPoolExecutor(max_workers=concurrency) as pool:
        accepted = list(pool.map(submit, range(count)))
    accepted_seconds = monotonic()-start
    remaining = {job_id: content for job_id, content, _ in accepted}
    deadline = monotonic()+max(30, count//10)
    while remaining and monotonic() < deadline:
        for job_id, content in list(remaining.items()):
            with urlopen(base + '/jobs/' + job_id, timeout=15) as response:
                item = json.load(response)
            if item['status'] == 'failed':
                raise AssertionError(f'Job failed: {job_id}')
            if item['status'] == 'done':
                expected = sha256(content.encode()).hexdigest().upper()
                assert item['result']['Sha256'] == expected, job_id
                del remaining[job_id]
        if remaining: sleep(.05)
    if remaining: raise TimeoutError(f'{len(remaining)} jobs unfinished')
    duration = monotonic()-start
    latency = [ms for _, _, ms in accepted]
    return {'count':count,'concurrency':concurrency,'accepted_per_second':round(count/accepted_seconds,2),
            'completed_per_second':round(count/duration,2),'total_seconds':round(duration,3),
            'http_ms_p50':round(median(latency),2),'http_ms_p95':round(percentile(latency,.95),2),
            'http_ms_p99':round(percentile(latency,.99),2),
            'note':'HTTP submission latency only; completed_per_second includes polling. Not a production benchmark.'}


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',default='http://127.0.0.1:5077')
    parser.add_argument('--count',type=int,default=100)
    parser.add_argument('--concurrency',type=int,default=10)
    args=parser.parse_args()
    if not (1 <= args.count <= 10000 and 1 <= args.concurrency <= 100):
        parser.error('count must be 1..10000, concurrency must be 1..100')
    print(json.dumps(run(args.base,args.count,args.concurrency),indent=2))
