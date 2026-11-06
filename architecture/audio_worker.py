"""Durable local AI worker for WAV jobs accepted by dotnet-outbox.

Worker uses PostgreSQL row locks; inference is performed while holding its
transaction so a crash rolls back all effects. Not suitable for high-volume ASR
without leasing and transaction-duration limits. Run against demo DB only.
"""
import argparse
from hashlib import sha256
import json
import os
from pathlib import Path
import sys
import tempfile
import time

AUDIO = Path(__file__).resolve().parents[1] / 'python-ai' / 'audio-search'
sys.path.insert(0, str(AUDIO))

MAX_ATTEMPTS = 5


def process_audio(blob: bytes, filename: str, *, transcriber=None, encoder=None):
    if not blob.startswith(b'RIFF') or blob[8:12] != b'WAVE' or not 44 <= len(blob) <= 262_144:
        raise ValueError('Invalid WAV content')
    if transcriber is None:
        from pipeline import recognize
        transcriber = recognize
    # No file path from an untrusted request is ever used for writing.
    with tempfile.TemporaryDirectory(prefix='portfolio-audio-') as folder:
        audio = Path(folder) / 'input.wav'
        audio.write_bytes(blob)
        passages = transcriber(audio)
    if encoder is None:
        from pipeline import OnnxEncoder
        encoder = OnnxEncoder()
    from search import TranscriptIndex
    normalized = [{**p, 'source': filename} for p in passages]
    index = TranscriptIndex(normalized, encoder)
    return {'source': filename, 'sha256': sha256(blob).hexdigest().upper(),
            'segments': [{**row, 'embedding': vector} for row, vector in zip(index.records, index.vectors)]}


def search_result(result, question, encoder, k=3):
    """Read persisted vectors; query does not recompute document embeddings."""
    from search import unit
    if not question.strip() or k < 1:
        raise ValueError('Nonempty question and positive k required')
    rows = result['segments']
    if not rows:
        return []
    qvectors = list(encoder.encode([question]))
    if len(qvectors) != 1:
        raise ValueError('Expected one query embedding')
    q = unit(qvectors[0], len(rows[0]['embedding']))
    from heapq import nlargest
    scores = ((sum(a*b for a,b in zip(q, row['embedding'])), -i, i) for i,row in enumerate(rows))
    return [{**{field: rows[i][field] for field in ('source','start','end','text')}, 'score':round(score,6)}
            for score,_,i in nlargest(k,scores)]


def process_one(connection_string, *, processor=process_audio, lease_seconds=180, on_event=None, heartbeat=True):
    """Short claim and finalize transactions; token prevents stale result writes."""
    import psycopg
    from uuid import uuid4
    started = time.perf_counter()

    def emit(stage, job=None):
        if on_event is not None:
            try:
                on_event({'event': stage, 'job_id': str(job) if job else None,
                          'elapsed_ms': round((time.perf_counter() - started) * 1000, 2)})
            except Exception:
                pass  # Telemetry cannot change durable processing semantics.
    if not isinstance(lease_seconds, int) or not 1 <= lease_seconds <= 3600:
        raise ValueError('lease_seconds must be between 1 and 3600')
    token = uuid4()
    with psycopg.connect(connection_string) as conn:
        with conn.transaction():
            with conn.cursor() as cur:
                cur.execute("""SELECT o.id, o.job_id, j.audio_payload, j.audio_name
                               FROM outbox o JOIN jobs j ON j.id=o.job_id
                               WHERE j.kind='audio' AND o.processed_at IS NULL
                               AND o.next_attempt_at <= now()
                               AND (o.lease_until IS NULL OR o.lease_until <= now())
                               ORDER BY o.next_attempt_at,o.created_at
                               FOR UPDATE OF o SKIP LOCKED LIMIT 1""")
                row = cur.fetchone()
                if row is None:
                    return False
                event_id, job_id, blob, name = row
                cur.execute("""UPDATE outbox SET lease_token=%s,
                               lease_until=now()+(%s*interval '1 second') WHERE id=%s""",
                            (token, lease_seconds, event_id))
    emit('lease_acquired', job_id)
    from lease_heartbeat import LeaseHeartbeat
    renewal = LeaseHeartbeat(connection_string, event_id, token, lease_seconds,
                             lambda stage: emit(stage, job_id)) if heartbeat else None
    if renewal is not None:
        renewal.start()
    try:
        try:
            result = processor(bytes(blob), name)
            error = None
        except Exception as exc:
            result = None
            error = type(exc).__name__
    finally:
        if renewal is not None:
            renewal.stop()
    with psycopg.connect(connection_string) as conn:
        with conn.transaction():
            with conn.cursor() as cur:
                cur.execute("""SELECT attempts FROM outbox WHERE id=%s AND
                               lease_token=%s AND lease_until > now()
                               AND processed_at IS NULL FOR UPDATE""", (event_id, token))
                owned = cur.fetchone()
                if owned is None:
                    emit('lease_lost', job_id)
                    return False  # Lease expired or another worker reclaimed it.
                if error is not None:
                    attempt = owned[0] + 1
                    delay = min(60, 2 ** min(attempt - 1, 30))
                    cur.execute("""UPDATE outbox SET attempts=%s,
                                   next_attempt_at=CASE WHEN %s >= %s
                                   THEN 'infinity'::timestamptz
                                   ELSE now()+(%s*interval '1 second') END,
                                   last_error=%s,lease_token=NULL,lease_until=NULL
                                   WHERE id=%s""",
                                (attempt, attempt, MAX_ATTEMPTS, delay, error, event_id))
                    if attempt >= MAX_ATTEMPTS:
                        cur.execute("UPDATE jobs SET status='failed',updated_at=now() WHERE id=%s", (job_id,))
                else:
                    payload = json.dumps(result, ensure_ascii=False, allow_nan=False)
                    cur.execute("UPDATE jobs SET status='done',result=%s::jsonb,updated_at=now() WHERE id=%s",
                                (payload, job_id))
                    cur.execute("""UPDATE outbox SET processed_at=now(),last_error=NULL,
                                   lease_token=NULL,lease_until=NULL WHERE id=%s""", (event_id,))
    emit('handler_failure' if error else 'completed', job_id)
    return True


def fetch_and_search(connection_string, job_id, question, k=3, *, encoder=None):
    import psycopg
    with psycopg.connect(connection_string) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT result FROM jobs WHERE id=%s AND kind='audio' AND status='done'", (job_id,))
            row=cur.fetchone()
    if row is None:
        raise ValueError('No completed audio job found')
    if encoder is None:
        from pipeline import OnnxEncoder
        encoder=OnnxEncoder()
    return search_result(row[0],question,encoder,k)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    work = sub.add_parser('worker')
    work.add_argument('--once', action='store_true')
    search = sub.add_parser('search')
    search.add_argument('job_id')
    search.add_argument('question')
    search.add_argument('--k', type=int, default=3)
    args = parser.parse_args()
    cs=os.environ.get('JOBS_TEST_CONNECTION') or os.environ.get('ConnectionStrings__Jobs')
    if not cs:
        parser.error('Set JOBS_TEST_CONNECTION to a disposable demo PostgreSQL database')
    if args.command == 'worker':
        def log_event(item):
            # No transcripts or media bytes in diagnostic events.
            print(json.dumps(item), file=sys.stderr, flush=True)
        while True:
            try:
                processed = process_one(cs, on_event=log_event)
            except KeyboardInterrupt:
                break
            except Exception as exc:
                print(f'Worker DB failure: {type(exc).__name__}', file=sys.stderr)
                processed = False
            if args.once:
                break
            if not processed:
                time.sleep(.5)
    else:
        print(json.dumps(fetch_and_search(cs, args.job_id,args.question,args.k),indent=2))


if __name__ == '__main__':
    main()
