"""Opt-in actual PostgreSQL transaction/retry checks. Disposable demo DB ONLY."""
import os
from pathlib import Path
import sys
from uuid import uuid4
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
from audio_worker import process_one



def connection():
    cs=os.getenv('JOBS_TEST_CONNECTION')
    if not cs:
        pytest.skip('JOBS_TEST_CONNECTION not set (integration test is not a pass)')
    return cs


def sample_job(cs):
    import psycopg
    key = 'test-audio-' + str(uuid4())
    jid,eid=uuid4(),uuid4()
    with psycopg.connect(cs) as db:
        with db.cursor() as cur:
            cur.execute("INSERT INTO jobs(id,idempotency_key,payload_sha256,input,status,kind,audio_payload,audio_name) VALUES (%s,%s,%s,'','queued','audio',%s,'test.wav')",
                        (jid,key,'0'*64,b'RIFF'+bytes(4)+b'WAVE'+bytes(40)))
            cur.execute('INSERT INTO outbox(id,job_id) VALUES (%s,%s)',(eid,jid))
        db.commit()
    return jid,eid


def cleanup(cs,jid):
    import psycopg
    with psycopg.connect(cs) as db:
        with db.cursor() as cur:
            cur.execute('DELETE FROM outbox WHERE job_id=%s',(jid,))
            cur.execute('DELETE FROM jobs WHERE id=%s',(jid,))
        db.commit()


def test_audio_claim_rollback_then_success():
    import psycopg
    cs=connection()
    jid,eid=sample_job(cs)
    try:
        with psycopg.connect(cs) as db:
            with db.transaction():
                with db.cursor() as cur:
                    cur.execute('SELECT id FROM outbox WHERE id=%s FOR UPDATE', (eid,))
                    assert cur.fetchone()[0] == eid
                    # A competing worker cannot claim the row.
                    assert process_one(cs,processor=lambda *_: {'segments': []}) is False
                    # Simulate the worker crash by rolling back its claim.
                    raise RollbackExpected()
    except RollbackExpected:
        pass
    try:
        assert process_one(cs, processor=lambda *_:{'segments':[]}) is True
        with psycopg.connect(cs) as db:
            with db.cursor() as cur:
                cur.execute('SELECT status,result FROM jobs WHERE id=%s',(jid,))
                assert cur.fetchone() == ('done',{'segments':[]})
                cur.execute('SELECT processed_at,attempts FROM outbox WHERE id=%s',(eid,))
                stamp, attempts=cur.fetchone()
                assert stamp is not None and attempts == 0
    finally:
        cleanup(cs,jid)


class RollbackExpected(Exception):
    pass


def test_handler_retry_exhaustion():
    import psycopg
    cs=connection()
    jid,eid=sample_job(cs)
    def fail(*_):
        raise ValueError('do not persist exception details')
    try:
        for n in range(1,6):
            assert process_one(cs,processor=fail) is True
            with psycopg.connect(cs) as db:
                with db.cursor() as cur:
                    cur.execute('SELECT attempts,last_error,processed_at FROM outbox WHERE id=%s',(eid,))
                    attempts,error,processed=cur.fetchone()
                    assert attempts == n and error == 'ValueError' and processed is None
                    if n < 5:
                        cur.execute('UPDATE outbox SET next_attempt_at=now() WHERE id=%s',(eid,))
                db.commit()
        assert process_one(cs,processor=fail) is False
        with psycopg.connect(cs) as db:
            with db.cursor() as cur:
                cur.execute('SELECT status FROM jobs WHERE id=%s',(jid,))
                assert cur.fetchone()[0]=='failed'
    finally:
        cleanup(cs,jid)


def test_worker_process_termination_releases_inflight_claim(tmp_path):
    """Terminate a dedicated child during inference and verify SQL rollback/replay."""
    import subprocess
    import time
    import psycopg
    cs = connection()
    jid, eid = sample_job(cs)
    claimed = tmp_path / 'claimed.txt'
    source = '''import sys, time
from pathlib import Path
sys.path.insert(0, sys.argv[1])
from audio_worker import process_one

def parked_processor(data, filename):
    Path(sys.argv[2]).write_text("claimed", encoding="utf8")
    time.sleep(90)
    return {"segments": []}

process_one(sys.argv[3], processor=parked_processor, lease_seconds=2)
'''
    child = subprocess.Popen(
        [sys.executable, '-c', source, str(Path(__file__).resolve().parents[1]), str(claimed), cs],
        stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
    )
    try:
        deadline = time.monotonic() + 12
        while not claimed.exists() and child.poll() is None and time.monotonic() < deadline:
            time.sleep(.05)
        assert claimed.exists(), 'Child did not claim the event'
        assert process_one(cs, processor=lambda *_: {'segments': []}) is False
        child.terminate()
        child.communicate(timeout=5)
        deadline = time.monotonic() + 12
        while time.monotonic() < deadline:
            if process_one(cs, processor=lambda *_: {'segments': []}):
                break
            time.sleep(.1)
        else:
            pytest.fail('Event stayed unavailable after terminated child')
        with psycopg.connect(cs) as db:
            with db.cursor() as cur:
                cur.execute('SELECT status,result FROM jobs WHERE id=%s', (jid,))
                assert cur.fetchone() == ('done', {'segments': []})
                cur.execute('SELECT attempts,processed_at FROM outbox WHERE id=%s', (eid,))
                attempts, processed = cur.fetchone()
                assert attempts == 0 and processed is not None
    finally:
        if child.poll() is None:
            child.terminate()
            child.communicate(timeout=5)
        cleanup(cs, jid)

def test_inference_holds_no_postgres_transaction():
    import psycopg
    cs = connection()
    jid, eid = sample_job(cs)
    try:
        def processor(*_):
            with psycopg.connect(cs) as db:
                with db.cursor() as cur:
                    cur.execute('SELECT lease_token FROM outbox WHERE id=%s', (eid,))
                    assert cur.fetchone()[0] is not None
                    # Fails immediately if worker still holds a row lock.
                    cur.execute('SELECT id FROM outbox WHERE id=%s FOR UPDATE NOWAIT', (eid,))
                    assert cur.fetchone()[0] == eid
            return {'segments': []}
        events = []
        assert process_one(cs, processor=processor, on_event=events.append)
        assert [event['event'] for event in events] == ['lease_acquired', 'completed']
        assert all(event['job_id'] == str(jid) and event['elapsed_ms'] >= 0 for event in events)
        assert all('input' not in event and 'transcript' not in event for event in events)
    finally:
        cleanup(cs, jid)


def test_expired_lease_fences_stale_result():
    import psycopg
    cs = connection()
    jid, eid = sample_job(cs)
    try:
        def old_processor(*_):
            with psycopg.connect(cs) as db:
                with db.cursor() as cur:
                    cur.execute("UPDATE outbox SET lease_until=now()-interval '1 second' WHERE id=%s", (eid,))
                db.commit()
            # A new owner reclaims and commits after the prior lease expired.
            assert process_one(cs, processor=lambda *_: {'winner': 'new'}) is True
            return {'winner': 'stale'}
        assert process_one(cs, processor=old_processor) is False
        with psycopg.connect(cs) as db:
            with db.cursor() as cur:
                cur.execute('SELECT result,status FROM jobs WHERE id=%s', (jid,))
                assert cur.fetchone() == ({'winner': 'new'}, 'done')
                cur.execute('SELECT attempts,processed_at FROM outbox WHERE id=%s', (eid,))
                attempts, finished = cur.fetchone()
                assert attempts == 0 and finished is not None
    finally:
        cleanup(cs, jid)
