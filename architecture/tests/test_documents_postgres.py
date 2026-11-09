"""Opt-in real PostgreSQL document outbox tests. Disposable reliable_jobs only."""
import sys
from pathlib import Path
from uuid import uuid4

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from audio_worker import process_one
from document_pipeline import process_document


def dsn():
    import os
    value = os.getenv("JOBS_TEST_CONNECTION")
    if not value:
        pytest.skip("Disposable JOBS_TEST_CONNECTION not set")
    return value


def insert_document(cs):
    import psycopg
    job, event = uuid4(), uuid4()
    text = "The employee may request a refund within thirty days.\n"
    with psycopg.connect(cs) as db:
        with db.cursor() as cur:
            cur.execute("""INSERT INTO jobs(id,idempotency_key,payload_sha256,input,status,kind,document_name,tenant_id)
                           VALUES (%s,%s,%s,%s,'queued','document','returns.md','demo-team')""",
                        (job, "test-doc-" + str(uuid4()), "0"*64, text))
            cur.execute("INSERT INTO outbox(id,job_id) VALUES (%s,%s)", (event, job))
            cur.execute("""INSERT INTO audio_read_grants(job_id,tenant_id,subject_id)
                           VALUES (%s,'demo-team','interviewer')""", (job,))
        db.commit()
    return job, event, text


def cleanup(cs, job):
    import psycopg
    with psycopg.connect(cs) as db:
        with db.cursor() as cur:
            cur.execute("DELETE FROM outbox WHERE job_id=%s", (job,))
            cur.execute("DELETE FROM jobs WHERE id=%s", (job,))
        db.commit()


class FakeEncoder:
    def encode(self, texts):
        return [[0.6,0.8] for _ in texts]


def test_document_job_and_outbox_finalize_atomically():
    import psycopg
    cs = dsn()
    job, event, text = insert_document(cs)
    observed = []
    try:
        assert process_one(cs, document_processor=lambda body, name:
                           process_document(body, name, encoder=FakeEncoder()),
                           on_event=observed.append)
        with psycopg.connect(cs) as db:
            kind, status, source, result, input_text = db.execute(
                "SELECT kind,status,document_name,result,input FROM jobs WHERE id=%s", (job,)
            ).fetchone()
            attempts, finished = db.execute(
                "SELECT attempts,processed_at IS NOT NULL FROM outbox WHERE id=%s", (event,)
            ).fetchone()
            grants = db.execute("SELECT count(*) FROM audio_read_grants WHERE job_id=%s", (job,)).fetchone()[0]
        assert kind == "document" and status == "done" and source == "returns.md"
        assert input_text == text
        assert result["segments"][0]["source"] == "returns.md"
        assert result["segments"][0]["embedding"] == [0.6,0.8]
        assert attempts == 0 and finished and grants == 1
        assert [e["event"] for e in observed] == ["lease_acquired", "completed"]
    finally:
        cleanup(cs, job)


def test_document_retry_retains_payload_and_releases_lease():
    import psycopg
    cs = dsn()
    job, event, text = insert_document(cs)
    def failing(_body, _name):
        raise ValueError("do not persist this sensitive error text")
    try:
        assert process_one(cs, document_processor=failing)
        with psycopg.connect(cs) as db:
            attempts, error, token, lease = db.execute(
                "SELECT attempts,last_error,lease_token,lease_until FROM outbox WHERE id=%s", (event,)
            ).fetchone()
            status, input_text = db.execute(
                "SELECT status,input FROM jobs WHERE id=%s", (job,)
            ).fetchone()
            assert attempts == 1 and error == "ValueError" and token is None and lease is None
            assert status == "queued" and input_text == text
            db.execute("UPDATE outbox SET next_attempt_at=now() WHERE id=%s", (event,))
            db.commit()
        assert process_one(cs, document_processor=lambda body,name:
                           process_document(body,name,encoder=FakeEncoder()))
        with psycopg.connect(cs) as db:
            attempts, finished = db.execute(
                "SELECT attempts,processed_at IS NOT NULL FROM outbox WHERE id=%s", (event,)
            ).fetchone()
            status = db.execute("SELECT status FROM jobs WHERE id=%s", (job,)).fetchone()[0]
        assert attempts == 1 and finished and status == "done"
    finally:
        cleanup(cs, job)
