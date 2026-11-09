"""Optional local Qwen: schema enforcement, ACL, abstention, injection gates."""
import json
from pathlib import Path
import sys
from uuid import uuid4

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import guarded_generation as gen


def hit(kind="document", quote="Customers may request a refund within 30 days."):
    row = {
        "job_id": str(uuid4()), "kind": kind,
        "source": "refund-policy.md" if kind == "document" else "call.wav",
        "text": quote, "score": .94,
    }
    if kind == "document":
        row.update({"char_start": 0, "char_end": len(quote)})
    else:
        row.update({"start": 0., "end": 4.})
    return row


def envelope(value, *, done=True, reason="stop"):
    return json.dumps({
        "done": done, "done_reason": reason,
        "message": {"content": json.dumps(value)}
    }).encode()


def raw_content(raw):
    return json.dumps({"done": True, "done_reason": "stop",
                       "message": {"content": raw}}).encode()


def result_for(model, *, hits=None, question="When can customers request a refund?"):
    return gen.generated_answer(
        {"hits": hits if hits is not None else [hit()], "abstained": False},
        question, "not-a-real-database", "team", "alice", call_model=model
    )


def test_generated_success_only_server_owned_quotes_and_citation_ids(monkeypatch):
    monkeypatch.setattr(gen, "authorized_now", lambda d, t, s, c: True)
    seen = []
    def model(question, citations):
        seen.append((question, citations))
        return envelope({"answer": "The refund window is 30 days.",
                         "citation_ids": ["E1"], "abstain": False})
    result = result_for(model)
    assert not result["abstained"]
    assert result["mode"] == "generated"
    assert result["answer"] == "The refund window is 30 days."
    assert result["model"] == "qwen3:8b"
    assert result["semantic_verified"] is False
    assert result["citations"][0]["quote"] == "Customers may request a refund within 30 days."
    assert result["citations"][0]["source"] == "refund-policy.md"
    assert len(seen) == 1 and len(seen[0][1]) == 1
    assert "embedding" not in result["citations"][0]


@pytest.mark.parametrize("output", [
    envelope({"answer": "False fact", "citation_ids": ["E99"], "abstain": False}),
    envelope({"answer": "False fact", "citation_ids": [], "abstain": False}),
    envelope({"answer": "", "citation_ids": ["E1"], "abstain": False}),
    envelope({"answer": "Unjustified", "citation_ids": ["E1", "E1"], "abstain": False}),
    envelope({"answer": "Unjustified", "citation_ids": ["E1"], "abstain": "false"}),
    envelope({"answer": "Unjustified", "citation_ids": ["E1"], "abstain": True}),
    envelope({"answer": "Unjustified", "citation_ids": ["E1"], "abstain": False, "other": 1}),
    envelope({"answer": "\ud800", "citation_ids": ["E1"], "abstain": False}),
    envelope({"answer": "x" * 1001, "citation_ids": ["E1"], "abstain": False}),
    envelope({"answer": "yes", "citation_ids": ["E1"], "abstain": False}, done=False),
    envelope({"answer": "yes", "citation_ids": ["E1"], "abstain": False}, reason="length"),
    raw_content('{"answer":"yes","answer":"no","citation_ids":["E1"],"abstain":false}'),
    raw_content('fenced JSON output is not accepted'),
    b"",
    b"{}",
    b"x" * (gen.MAX_ENVELOPE_BYTES+1),
])
def test_model_invalid_output_abstains_without_leaking(monkeypatch, output):
    monkeypatch.setattr(gen, "authorized_now", lambda d, t, s, c: True)
    result = result_for(lambda q,c: output)
    assert result["abstained"]
    assert result["citations"] == []
    assert result["reason"] == "invalid_model_output"
    assert result["answer"] == gen.REFUSAL


def test_explicit_model_abstention(monkeypatch):
    monkeypatch.setattr(gen, "authorized_now", lambda d,t,s,c: True)
    res = result_for(lambda q,c: envelope({"answer":"","citation_ids":[],"abstain":True}))
    assert res["abstained"] and res["reason"] == "model_abstained"


def test_no_evidence_means_no_llm_call(monkeypatch):
    def forbidden(q, c):
        raise AssertionError("LLM must never see missing or low-quality evidence")
    for data in [
        {"hits": [], "abstained": True, "reason": "no_authorized_evidence"},
        {"hits": [hit()], "abstained": True, "reason": "no_compatible_evidence"},
        {"hits": [dict(hit(), score=.12)], "abstained": False},
    ]:
        result = gen.generated_answer(
            data, "refund?", "dsn", "tenant", "subject", call_model=forbidden)
        assert result["abstained"] and not result["citations"]


def test_revoke_during_generation_denies_even_if_model_cites_right_id(monkeypatch):
    calls = []
    monkeypatch.setattr(gen, "authorized_now",
                        lambda d, t, s, c: calls.append([x["job_id"] for x in c]) or False)
    res = result_for(lambda q,c: envelope(
        {"answer": "The window is 30 days.", "citation_ids":["E1"], "abstain":False}))
    assert res["abstained"] and res["reason"] == "authorization_changed"
    assert not res["citations"]
    assert len(calls) == 1


def test_all_sources_are_rechecked_not_only_cited(monkeypatch):
    inspected = []
    def fresh(d, t, s, citations):
        inspected.extend(c["job_id"] for c in citations)
        return True
    monkeypatch.setattr(gen, "authorized_now", fresh)
    audio, doc = hit("audio"), hit("document")
    res = result_for(lambda q,c: envelope({
        "answer":"Thirty days.","citation_ids":["E1"],"abstain":False}),
        hits=[audio,doc])
    assert not res["abstained"]
    assert inspected == [audio["job_id"], doc["job_id"]]
    assert len(res["citations"]) == 1


def test_http_requires_signed_identity_and_blocks_client_claims(monkeypatch):
    from fastapi.testclient import TestClient
    from audio_access import issue_token
    from search_api import app
    monkeypatch.setenv("DEMO_AUTH_SECRET", "ep05b-disposable-secret-0123456789abcdefghijklmnop")
    monkeypatch.setenv("JOBS_TEST_CONNECTION", "dbname=unused")
    client=TestClient(app)
    for body in [
        {"question":"refund?", "mode":"generated", "citations":["E1"]},
        {"question":"refund?", "mode":"generated", "tenant":"victim"},
        {"question":"refund?", "mode":"other"},
    ]:
        assert client.post("/answer", json=body).status_code == 422
    assert client.post("/answer", json={"question":"refund?", "mode":"generated"}).status_code == 401
    authorized=[]
    monkeypatch.setattr("search_api.retrieve_authorized",
        lambda d,t,s,q,k: authorized.append((t,s)) or
        {"hits":[hit()], "abstained":False})
    monkeypatch.setattr("search_api.generated_answer",
        lambda r,q,d,t,s: {"mode":"generated","answer":"Valid",
           "abstained":False,"citations":[],"semantic_verified":False,
           "reason":"test","model":"qwen3:8b"})
    token=issue_token("company","alice")
    response=client.post("/answer", json={"question":"refund?", "mode":"generated"},
        headers={"Authorization":"Bearer "+token})
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    assert authorized == [("company","alice")]


def test_model_offline_does_not_impact_extract_mode(monkeypatch):
    from fastapi.testclient import TestClient
    from audio_access import issue_token
    from search_api import app
    monkeypatch.setenv("DEMO_AUTH_SECRET", "ep05b-disposable-secret-0123456789abcdefghijklmnop")
    monkeypatch.setenv("JOBS_TEST_CONNECTION", "dbname=unused")
    monkeypatch.setattr("search_api.retrieve_authorized",
        lambda d,t,s,q,k: {"hits":[hit("audio")], "abstained":False})
    monkeypatch.setattr("search_api.generated_answer",
        lambda r,q,d,t,s: (_ for _ in ()).throw(gen.ModelUnavailable("offline")))
    token=issue_token("company","alice")
    headers={"Authorization":"Bearer "+token}
    client=TestClient(app)
    generated=client.post("/answer", json={"question":"refund?", "mode":"generated"},
                          headers=headers)
    assert generated.status_code == 503
    assert generated.json()["detail"] == "Local LLM unavailable"
    extract=client.post("/answer", json={"question":"refund?"}, headers=headers)
    assert extract.status_code == 200
    assert extract.json()["mode"] == "evidence"
    assert extract.json()["citations"][0]["source"] == "call.wav"


def test_no_remote_connection_config_or_model_proxy_in_request():
    assert gen.URL == "http://127.0.0.1:11434/api/chat"
    assert gen.MAX_REQUEST_BYTES <= 12_000
    assert gen.MAX_ENVELOPE_BYTES <= 32_768
