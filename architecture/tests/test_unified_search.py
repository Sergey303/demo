"""Pure, offline EP-04 retrieval and request-boundary tests."""
import os
from pathlib import Path
import sys
from uuid import uuid4

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import unified_search as search


class Encoder:
    def __init__(self, vector=None):
        self.calls = []
        self.vector = vector or [0.6, 0.8]

    def encode(self, texts):
        self.calls.extend(texts)
        return [self.vector for _ in texts]


def test_metadata_and_scores_are_typed_and_vectors_are_never_returned():
    audio = search.evidence(uuid4(), "audio", {
        "source": "sample.wav", "text": "Pay within thirty days", "start": 0., "end": 3.,
        "embedding": [0.6, 0.8]}, 2)
    doc = search.evidence(uuid4(), "document", {
        "source": "policy.md", "text": "Budget approved", "chunk_index": 0,
        "char_start": 0, "char_end": 15, "embedding": [0.1, 0.9]}, 2)
    assert audio and doc
    assert audio["metadata"]["kind"] == "audio"
    assert doc["metadata"]["kind"] == "document"
    assert "embedding" not in str(audio["metadata"])
    assert "vector" not in str(doc["metadata"])


@pytest.mark.parametrize("item", [
    {"source": "x.wav", "text": "hi", "start": 0, "end": 1, "embedding": [float("nan")]},
    {"source": "x.wav", "text": "hi", "start": 0, "end": 1, "embedding": [0., 0.]},
    {"source": "x.wav", "text": "hi", "start": 2, "end": 1, "embedding": [1., 1.]},
    {"source": "x.wav", "text": "hi", "start": 0, "end": 1, "embedding": [1., 1., 1.]},
])
def test_bad_audio_segments_skipped(item):
    assert search.evidence(uuid4(), "audio", item, 2) is None


def test_invalid_request_and_vector_contract():
    assert search.unit([3,4]) == pytest.approx([0.6, 0.8])
    with pytest.raises(ValueError):
        search.unit([0, 0])
    with pytest.raises(ValueError):
        search.unit([float("inf"), 1])
    for bad in [0, 6, True, "4"]:
        with pytest.raises(ValueError):
            search.retrieve_authorized("unreachable", "a", "b", "question", bad, encoder=Encoder())
    for bad in ["", " ", "x"*501]:
        with pytest.raises(ValueError):
            search.retrieve_authorized("unreachable", "a", "b", bad, encoder=Encoder())


def test_api_unauthorized_and_no_cache(monkeypatch):
    from fastapi.testclient import TestClient
    from search_api import app

    client = TestClient(app)
    denied = client.post("/search", json={"question": "refund"})
    assert denied.status_code == 401
    assert denied.headers["cache-control"] == "no-store"
    assert client.post("/search", json={"question": "refund", "top_k": 12}).status_code == 422
    assert client.post("/search", json={"question": "refund", "tenant": "fake"}).status_code == 422

    monkeypatch.setenv("DEMO_AUTH_SECRET", "test-secret-0123456789-abcdefghijklmnopqrstuvwxyz")
    monkeypatch.setenv("JOBS_TEST_CONNECTION", "dbname=reliable_jobs")
    from audio_access import issue_token
    token = issue_token("team-A", "user-B")
    monkeypatch.setattr("search_api.retrieve_authorized", lambda dsn, tenant, subject, question, top_k:
                        {"hits": [], "abstained": True, "reason": "no_authorized_evidence"}
                        if (tenant, subject, question, top_k) == ("team-A", "user-B", "refund", 3)
                        else (_ for _ in ()).throw(AssertionError("identity mismatch")))
    allowed = client.post("/search", headers={"Authorization": "Bearer "+token},
                          json={"question": "refund"})
    assert allowed.status_code == 200
    assert allowed.json()["abstained"] and not allowed.json()["hits"]
    assert "no-store" in allowed.headers["cache-control"]

    wrong = client.post("/search", headers={"Authorization": "Bearer invalid"},
                        json={"question": "refund"})
    assert wrong.status_code == 401
    assert "tenant" not in wrong.text
