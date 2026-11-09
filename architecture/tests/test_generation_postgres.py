"""Real disposable PostgreSQL grant filtering around optional LLM inference."""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_search_postgres import connection, delete, insert, Encoder


def envelope(answer="30 days", ids=None):
    return json.dumps({
        "done": True, "done_reason": "stop",
        "message": {"content": json.dumps({
            "answer": answer, "citation_ids": ["E1"] if ids is None else ids,
            "abstain": False,
        })},
    }).encode()


def test_generated_query_grants_pre_and_post_inference_with_fresh_sql(monkeypatch):
    import psycopg
    from fastapi.testclient import TestClient
    from audio_access import issue_token
    from search_api import app
    import unified_search
    import guarded_generation as gen

    dsn = connection()
    monkeypatch.setenv("JOBS_TEST_CONNECTION", dsn)
    monkeypatch.setenv("DEMO_AUTH_SECRET", "ep05b-real-pg-test-secret-0123456789abcdefghijklmnop")
    monkeypatch.setattr(unified_search, "local_encoder", lambda: Encoder())
    client = TestClient(app)
    correct = issue_token("ep05b-tenant", "alice")
    wrong_tenant = issue_token("another-team", "alice")
    wrong_subject = issue_token("ep05b-tenant", "bob")
    headers = {"Authorization": "Bearer " + correct}
    ask = {"question": "When can customers request a refund?",
           "top_k": 5, "mode": "generated"}
    ids=[]
    calls=[]
    try:
        job = insert(dsn, "document", "ep05b-tenant", "policy.md",
                     "Customers may request a refund within 30 days.",
                     [.6,.8], subject="alice")
        ids.append(job)
        # Codex P2 regression: two different excerpts of the SAME job may both
        # be sent to Qwen, and must not be refused as duplicate job IDs.
        assert gen.authorized_now(dsn, "ep05b-tenant", "alice",
            [{"job_id": str(job), "quote": "First original excerpt."},
             {"job_id": str(job), "quote": "Another original excerpt."}])
        assert not gen.authorized_now(dsn, "ep05b-tenant", "bob",
            [{"job_id": str(job)}, {"job_id": str(job)}])
        secret = insert(dsn, "document", "another-team", "private.md",
                        "Highly confidential, never leak.",
                        [.6,.8], subject="alice")
        ids.append(secret)
        def authorized_model(question, citations):
            calls.append([c["job_id"] for c in citations])
            assert len(citations) == 1
            assert citations[0]["job_id"] == str(job)
            assert "confidential" not in json.dumps(citations).lower()
            return envelope()
        monkeypatch.setattr(gen, "_call_ollama", authorized_model)
        result = client.post("/answer",json=ask,headers=headers)
        assert result.status_code == 200
        assert result.headers["Cache-Control"] == "no-store"
        data=result.json()
        assert data["mode"] == "generated" and data["semantic_verified"] is False
        assert not data["abstained"] and data["answer"] == "30 days"
        assert data["citations"][0]["job_id"] == str(job)
        assert "confidential" not in result.text
        assert len(calls) == 1

        unrelated = client.post("/answer",json=ask,
            headers={"Authorization":"Bearer "+wrong_tenant})
        assert unrelated.status_code == 200 and unrelated.json()["abstained"]
        assert "confidential" not in unrelated.text
        outsider = client.post("/answer",json=ask,
            headers={"Authorization":"Bearer "+wrong_subject})
        assert outsider.status_code == 200 and outsider.json()["abstained"]
        assert len(calls) == 1  # Cannot invoke model without qualifying evidence.

        # Revoke after the SQL-selected evidence was already sent to Ollama.
        def revoked_during_model(question, citations):
            with psycopg.connect(dsn) as db:
                db.execute("DELETE FROM audio_read_grants WHERE job_id=%s", (job,))
                db.commit()
            return envelope()
        monkeypatch.setattr(gen, "_call_ollama", revoked_during_model)
        revoked = client.post("/answer",json=ask,headers=headers)
        assert revoked.status_code == 200
        assert revoked.json()["abstained"]
        assert revoked.json()["citations"] == []
        assert revoked.json()["reason"] == "authorization_changed"
        # Next request never loads model or includes revoked excerpt in prompt.
        def forbidden(*args):
            raise AssertionError("Unauthorized text must never reach Qwen")
        monkeypatch.setattr(gen, "_call_ollama", forbidden)
        final = client.post("/answer",json=ask,headers=headers)
        assert final.status_code == 200 and final.json()["abstained"]
        assert final.json()["reason"] == "no_authorized_evidence"
    finally:
        delete(dsn,ids)


def test_two_segments_from_one_real_job_can_both_be_cited(monkeypatch):
    import psycopg
    from unified_search import retrieve_authorized
    import guarded_generation as gen

    dsn = connection()
    first = "Customers may request a refund within 30 days."
    second = "Customers must request a refund no later than 30 days."
    job = insert(dsn, "document", "ep05b-shared-job", "policy.md",
                 first + "\n" + second, [.6,.8], subject="alice")
    try:
        segments = [
            {"source":"policy.md","text":first,"embedding":[.6,.8],
             "char_start":0,"char_end":len(first),"chunk_index":0},
            {"source":"policy.md","text":second,"embedding":[.6,.8],
             "char_start":len(first)+1,"char_end":len(first)+1+len(second),
             "chunk_index":1},
        ]
        with psycopg.connect(dsn) as db:
            db.execute("UPDATE jobs SET result=jsonb_set(result, '{segments}', %s::jsonb) WHERE id=%s",
                       (json.dumps(segments),job))
            db.commit()
        search = retrieve_authorized(
            dsn,"ep05b-shared-job","alice","When can customers request a refund?",
            top_k=5,encoder=Encoder())
        assert len(search["hits"]) == 2
        answer = gen.generated_answer(search,
            "When can customers request a refund?", dsn,"ep05b-shared-job","alice",
            call_model=lambda q,c: envelope(
                "Refunds must be requested within thirty days.",ids=["E1","E2"]))
        assert not answer["abstained"], answer
        assert [c["job_id"] for c in answer["citations"]] == [str(job),str(job)]
        assert {c["quote"] for c in answer["citations"]} == {first,second}
        assert answer["semantic_verified"] is False
    finally:
        delete(dsn,[job])
