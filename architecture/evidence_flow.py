"""Runnable cross-project evidence flow: local ASR -> durable text job -> neural search.

This is an orchestration-level integration, NOT durable audio ingestion: recognition
happens before POST. Existing .NET Jobs worker persists/verifies a text digest.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys
from time import monotonic, sleep
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

AUDIO = Path(__file__).resolve().parents[1] / 'python-ai' / 'audio-search'


def local_url(base):
    parsed = urlparse(base)
    if parsed.scheme != 'http' or parsed.hostname not in ('127.0.0.1', 'localhost') or not parsed.port or parsed.username or parsed.password or parsed.path not in ('', '/') or parsed.query or parsed.fragment:
        raise ValueError('Jobs API must be an explicit local HTTP host:port')
    return base.rstrip('/')


def request_json(url, *, payload=None, key=None):
    headers = {'Content-Type': 'application/json'} if payload is not None else {}
    if key:
        headers['Idempotency-Key'] = key
    req = Request(url, data=json.dumps(payload).encode() if payload is not None else None,
                  headers=headers, method='POST' if payload is not None else 'GET')
    try:
        with urlopen(req, timeout=6) as resp:
            return resp.status, json.load(resp)
    except HTTPError as exc:
        with exc:
            return exc.code, json.load(exc)


def run(files, question, *, base='http://127.0.0.1:5077', transcriber=None, encoder=None,
        transport=request_json, deadline_seconds=20):
    base = local_url(base)
    if not files or not question.strip() or deadline_seconds <= 0:
        raise ValueError('Provide files, nonempty question and positive deadline')
    if transcriber is None or encoder is None:
        sys.path.insert(0, str(AUDIO))
        from pipeline import recognize, OnnxEncoder
        transcriber = transcriber or recognize
        encoder = encoder or OnnxEncoder()
    sys.path.insert(0, str(AUDIO))
    from search import TranscriptIndex
    rows = []
    for file in files:
        rows.extend(transcriber(Path(file)))
    if not rows:
        raise ValueError('No speech segments; nothing is submitted to the job API')
    # Stable semantic content: a retry of the same transcript reuses the job key.
    data = json.dumps(rows, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    if len(data) > 2000:
        raise ValueError('Transcript exceeds Jobs text limit (2000 chars); no upload attempted')
    key = 'audio-transcript-' + sha256(data.encode('utf-8')).hexdigest()
    status, accepted = transport(base + '/jobs', payload={'text': data}, key=key)
    if status not in (200, 202) or 'id' not in accepted:
        raise RuntimeError(f'Job not accepted: HTTP {status}')
    job_id = accepted['id']
    deadline = monotonic() + deadline_seconds
    while monotonic() < deadline:
        status, job = transport(base + '/jobs/' + job_id)
        if status != 200 or job.get('id', '').lower() != job_id.lower():
            raise RuntimeError('Unexpected job status response')
        if job['status'] == 'failed':
            raise RuntimeError('Durable job failed')
        if job['status'] == 'done':
            expected_hash = sha256(data.encode('utf-8')).hexdigest().upper()
            expected_words = len(data.split())
            result = job.get('result') or {}
            if result.get('Sha256') != expected_hash or result.get('WordCount') != expected_words:
                raise RuntimeError('Persisted digest/word count do not match submitted transcript')
            index = TranscriptIndex(rows, encoder)
            hits = index.search(question, k=3)
            return {'job_id': job_id, 'job_status': 'done', 'source_count': len(files),
                    'segments': len(rows), 'top_hits': [vars(hit) for hit in hits],
                    'note': 'Local ASR precedes durable job acceptance; this does NOT provide durable ASR ingestion.'}
        if job['status'] != 'queued':
            raise RuntimeError('Unknown job status')
        sleep(.2)
    raise TimeoutError('Job did not finish before the deadline')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('audio', nargs='+', type=Path)
    parser.add_argument('--question', required=True)
    parser.add_argument('--jobs-url', default='http://127.0.0.1:5077')
    args = parser.parse_args()
    print(json.dumps(run(args.audio, args.question, base=args.jobs_url), indent=2))


if __name__ == '__main__':
    main()
