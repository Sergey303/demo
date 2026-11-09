"""Real disposable PostgreSQL authorization/revocation tests for unified retrieval.

Set JOBS_TEST_CONNECTION only for isolated reliable_jobs DB with migrations 001-005.
Tests insert their own uniquely keyed synthetic data, then delete it.
"""
import os
from pathlib import Path
import sys
from uuid import uuid4

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from unified_search import retrieve_authorized, MODEL


class Encoder:
    def __init__(self, vector=None):
        self.vector = vector or [0.6, 0.8]
        self.calls = []

    def encode(self, texts):
        self.calls.extend(texts)
        return [self.vector for _ in texts]


def connection():
    cs = os.environ.get("JOBS_TEST_CONNECTION")
    if not cs:
        pytest.skip("No disposable JOBS_TEST_CONNECTION; not a passing integration test")
    return cs


def insert(cs, kind, tenant, source, body, vector, *, subject="interviewer", grant=True):
    import psycopg
    job = uuid4()
    result = {"source": source, "segments": [{
        "source": source, "text": body, "embedding": vector,
        **({"start":0.0,"end":2.0} if kind == "audio" else {
            "chunk_index":0,"char_start":0,"char_end":len(body)}),
    }]}
    if kind == "document":
        result["model"] = MODEL
    with psycopg.connect(cs) as db:
        db.execute("""INSERT INTO jobs
            (id,idempotency_key,payload_sha256,input,status,kind,tenant_id,document_name,audio_name,result)
            VALUES (%s,%s,%s,%s,'done',%s,%s,%s,%s,%s::jsonb)""",
            (job, "ep04-" + str(uuid4()), "0"*64, body if kind=="document" else "",
             kind, tenant, source if kind=="document" else None,
             source if kind=="audio" else None, __import__("json").dumps(result)))
        if grant:
            db.execute("""INSERT INTO audio_read_grants(job_id,tenant_id,subject_id)
                      VALUES (%s,%s,%s)""", (job,tenant,subject))
        db.commit()
    return job


def delete(cs, jobs):
    import psycopg
    with psycopg.connect(cs) as db:
        for job in jobs:
            db.execute("DELETE FROM outbox WHERE job_id=%s", (job,))
            db.execute("DELETE FROM jobs WHERE id=%s", (job,))
        db.commit()


def test_authorized_cross_modal_topk_and_immediate_revoke():
    import psycopg
    cs = connection()
    ids = []
    try:
        audio = insert(cs,"audio","demo-team","voice.wav","Refunds within 30 days", [0.6,0.8])
        document = insert(cs,"document","demo-team","policy.md","Invoices due in 14 days", [0.8,0.6])
        secret = insert(cs,"document","another-team","secret.md","Confidential pricing", [0.6,0.8])
        ungranted = insert(cs,"document","demo-team","ungranted.md","Invisible secret", [0.6,0.8],grant=False)
        ids.extend([audio,document,secret,ungranted])
        encoder=Encoder()
        got=retrieve_authorized(cs,"demo-team","interviewer","refund policy",5,encoder=encoder)
        assert encoder.calls == ["refund policy"]
        assert not got["abstained"] and len(got["hits"]) == 2
        assert {x["kind"] for x in got["hits"]} == {"audio","document"}
        assert got["hits"][0]["kind"] == "audio"
        assert not any("Confidential" in x["text"] or "Invisible" in x["text"] for x in got["hits"])
        assert all("embedding" not in x and "vector" not in x for x in got["hits"])
        assert got["hits"][0]["start"] == 0.0
        assert got["hits"][1]["char_start"] == 0

        got1=retrieve_authorized(cs,"demo-team","interviewer","refund policy",1,encoder=Encoder())
        assert len(got1["hits"]) == 1 and got1["hits"][0]["kind"] == "audio"

        with psycopg.connect(cs) as db:
            db.execute("DELETE FROM audio_read_grants WHERE job_id=%s",(document,))
            db.commit()
        after=retrieve_authorized(cs,"demo-team","interviewer","refund policy",5,encoder=Encoder())
        assert [x["kind"] for x in after["hits"]] == ["audio"]

        with psycopg.connect(cs) as db:
            db.execute("DELETE FROM audio_read_grants WHERE job_id=%s",(audio,))
            db.commit()
        nobody=Encoder()
        none=retrieve_authorized(cs,"demo-team","interviewer","refund policy",5,encoder=nobody)
        assert none["abstained"] and none["hits"] == []
        assert none["reason"] == "no_authorized_evidence"
        assert nobody.calls == []  # Never use model if no authorized SQL rows.

        other=retrieve_authorized(cs,"another-team","interviewer","refund policy",5,encoder=Encoder())
        assert len(other["hits"]) == 1 and other["hits"][0]["source"]=="secret.md"
    finally:
        delete(cs,ids)


def test_incompatible_only_corpus_abstains_without_model_loading():
    import psycopg
    cs = connection()
    ids = []
    try:
        document = insert(cs, "document", "incompatible-team", "obsolete.md",
                          "A policy encoded by another model", [0.6, 0.8])
        ids.append(document)
        with psycopg.connect(cs) as db:
            db.execute("""UPDATE jobs
                SET result=jsonb_set(result,'{model}', to_jsonb(%s::text))
                WHERE id=%s""", ("unrelated-embedding-model", document))
            db.commit()
        encoder = Encoder()
        response = retrieve_authorized(cs, "incompatible-team", "interviewer",
                                       "Find the policy", 3, encoder=encoder)
        assert response == {"hits": [], "abstained": True,
                            "reason": "no_compatible_evidence"}
        assert encoder.calls == []  # Do not even initialize unavailable ONNX.
    finally:
        delete(cs, ids)


def test_grant_subject_fails_closed_and_invalid_vectors_not_ranked():
    cs = connection()
    ids = []
    try:
        ids.append(insert(cs,"audio","one-team","voice.wav","Only for Alice",[0.6,0.8],subject="alice"))
        ids.append(insert(cs,"document","one-team","bad.md","Bad vector",[1.0],subject="alice"))
        wrong = Encoder()
        result = retrieve_authorized(cs,"one-team","bob","Who can read",3,encoder=wrong)
        assert result["abstained"] and result["hits"] == [] and wrong.calls == []
        allowed = retrieve_authorized(cs,"one-team","alice","Who can read",3,encoder=Encoder())
        assert len(allowed["hits"]) == 1
        assert allowed["hits"][0]["source"] == "voice.wav"
    finally:
        delete(cs,ids)
