"""EP-05: actual PostgreSQL ACL gate and exact quoted answer (no model download)."""
import os
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_search_postgres import connection, delete, insert, Encoder


def test_real_sql_authorized_answer_rechecks_grants_and_returns_exact_quotes(monkeypatch):
    from fastapi.testclient import TestClient
    from audio_access import issue_token
    from search_api import app
    import unified_search
    import psycopg

    dsn = connection()
    monkeypatch.setenv("JOBS_TEST_CONNECTION", dsn)
    monkeypatch.setenv("DEMO_AUTH_SECRET",
                       "ep05-disposable-test-secret-0123456789abcdefghijklmnopqrstuvwxyz")
    encoder = Encoder()
    monkeypatch.setattr(unified_search, "local_encoder", lambda: encoder)
    client = TestClient(app)
    token = issue_token("answer-team", "alice")
    other = issue_token("another-team", "alice")
    body = {"question": "When can customers request a refund?", "top_k": 5}
    audio_id = doc_id = None
    try:
        audio_id = insert(dsn, "audio", "answer-team", "meeting.wav",
                          "Customers can request refunds within 30 days.",
                          [0.6, 0.8], subject="alice")
        doc_id = insert(dsn, "document", "answer-team", "policy.md",
                        "The refund period is thirty days.",
                        [0.8, 0.6], subject="alice")
        # A second team and a second subject are never part of the quote set.
        secret = insert(dsn, "document", "another-team", "secret.md",
                        "Unauthorized secrets must not be quoted.",
                        [0.6, 0.8], subject="alice")
        private = insert(dsn, "document", "answer-team", "private.md",
                         "Bob's personal confidential text.",
                         [0.6, 0.8], subject="bob")
        ids = [audio_id, doc_id, secret, private]
        headers = {"Authorization": "Bearer " + token}
        first = client.post("/answer", headers=headers, json=body)
        assert first.status_code == 200
        result = first.json()
        assert result["mode"] == "evidence" and result["semantic_verified"] is False
        assert not result["abstained"]
        assert len(result["citations"]) == 2
        assert {c["source"] for c in result["citations"]} == {"meeting.wav", "policy.md"}
        assert {c["job_id"] for c in result["citations"]} == {str(audio_id), str(doc_id)}
        assert result["answer"] == "\n".join(c["quote"] for c in result["citations"])
        assert all("embedding" not in c and "vector" not in c for c in result["citations"])
        assert "Unauthorized secrets" not in first.text and "confidential" not in first.text
        assert first.headers["cache-control"] == "no-store"

        anon = client.post("/answer", json=body)
        assert anon.status_code == 401
        denied = client.post("/answer", headers={"Authorization": "Bearer bad"}, json=body)
        assert denied.status_code == 401
        other_refund = client.post("/answer",
                                   headers={"Authorization": "Bearer " + other}, json=body)
        assert other_refund.status_code == 200
        assert other_refund.json()["abstained"] and other_refund.json()["citations"] == []
        # A relevant question from the same other tenant may quote ITS own file,
        # never any data belonging to answer-team.
        other_result = client.post("/answer",
            headers={"Authorization": "Bearer " + other},
            json={"question": "Which unauthorized secrets must not be quoted?", "top_k": 5})
        assert other_result.status_code == 200
        assert [c["source"] for c in other_result.json()["citations"]] == ["secret.md"]

        # Deleting one grant must immediately remove that quote from next answer.
        with psycopg.connect(dsn) as db:
            db.execute("DELETE FROM audio_read_grants WHERE job_id=%s AND subject_id='alice'",
                       (doc_id,))
            db.commit()
        second = client.post("/answer", headers=headers, json=body)
        assert second.status_code == 200
        assert [c["source"] for c in second.json()["citations"]] == ["meeting.wav"]

        with psycopg.connect(dsn) as db:
            db.execute("DELETE FROM audio_read_grants WHERE job_id=%s AND subject_id='alice'",
                       (audio_id,))
            db.commit()
        model_calls = len(encoder.calls)
        final = client.post("/answer", headers=headers, json=body)
        assert final.status_code == 200
        payload = final.json()
        assert payload["abstained"] and payload["citations"] == []
        assert payload["answer"] == "Недостаточно разрешённых доказательств для ответа."
        assert len(encoder.calls) == model_calls  # No model when no authorized sources.
    finally:
        if audio_id is not None:
            delete(dsn, ids)


def test_real_sql_below_relevance_threshold_abstains_without_citations(monkeypatch):
    from fastapi.testclient import TestClient
    from audio_access import issue_token
    from search_api import app
    import unified_search

    dsn = connection()
    monkeypatch.setenv("JOBS_TEST_CONNECTION", dsn)
    monkeypatch.setenv("DEMO_AUTH_SECRET",
                       "ep05-disposable-test-secret-0123456789abcdefghijklmnopqrstuvwxyz")
    monkeypatch.setattr(unified_search, "local_encoder", lambda: Encoder())
    job = insert(dsn, "document", "low-score-team", "unrelated.md",
                 "Completely unrelated information", [-0.6, -0.8],
                 subject="alice")
    try:
        token = issue_token("low-score-team", "alice")
        response = TestClient(app).post(
            "/answer", headers={"Authorization": "Bearer " + token},
            json={"question": "refund", "top_k": 5},
        )
        assert response.status_code == 200
        answer = response.json()
        assert answer["abstained"] and answer["citations"] == []
        assert answer["reason"] == "below_relevance_threshold_or_invalid_citations"
    finally:
        delete(dsn, [job])
