"""Cross-tenant document retrieval, live revocation and API bypass tests."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from app.core import Passage, KnowledgeBase, chunk_documents
from app import main as rag_api
from app.access import authorized_sources, PolicyUnavailable
from audio_access import issue_token


class FakeEmbedder:
    def encode(self, texts):
        return [[1., 0.] if 'refund' in text.lower() else [0., 1.] for text in texts]


def test_document_ids_are_relative_paths_and_symlink_escape_is_skipped(tmp_path):
    docs = tmp_path / 'docs'
    (docs / 'team-a').mkdir(parents=True)
    (docs / 'team-b').mkdir()
    (docs / 'team-a' / 'same.md').write_text('refund rules')
    (docs / 'team-b' / 'same.md').write_text('private contract')
    outside = tmp_path / 'outside.txt'
    outside.write_text('secret never indexed')
    (docs / 'unsafe.txt').symlink_to(outside)
    passages = chunk_documents(docs)
    assert sorted(p.source for p in passages) == ['team-a/same.md', 'team-b/same.md']
    assert all('secret never indexed' not in p.text for p in passages)


def test_filtered_index_never_ranks_unauthorized_passages():
    kb = KnowledgeBase([Passage('a.md','refund rules'),
                        Passage('b.md','private contract')], FakeEmbedder())
    assert kb.search('refund', allowed_sources={'b.md'}, top_k=2)[0]['source'] == 'b.md'
    assert kb.search('refund', allowed_sources=set()) == []


def test_http_authorization_tenant_isolation_and_immediate_revocation(tmp_path, monkeypatch):
    from app import access
    monkeypatch.setenv('DEMO_AUTH_SECRET', 'unit-test-secret-only-long-enough-for-local-demo')
    docs = tmp_path / 'docs'
    (docs / 'a').mkdir(parents=True)
    (docs / 'b').mkdir()
    (docs / 'a' / 'returns.md').write_text('refund policy')
    (docs / 'a' / 'billing.md').write_text('billing rules')
    (docs / 'b' / 'returns.md').write_text('private contract for tenant b')
    kb = KnowledgeBase(chunk_documents(docs), FakeEmbedder())
    monkeypatch.setattr(rag_api, 'knowledge_base', lambda: kb)
    policy_file = tmp_path / 'acl.json'
    policy = {
        'a/returns.md': {'tenant':'team-a', 'readers':['alice']},
        'a/billing.md': {'tenant':'team-a', 'readers':['bob']},
        'b/returns.md': {'tenant':'team-b', 'readers':['bob']}
    }
    def publish():
        policy_file.write_text(json.dumps(policy))
    publish()
    monkeypatch.setenv('DOCS_ACL_FILE', str(policy_file))
    client = TestClient(rag_api.app)
    def ask(tenant, user, body=None):
        token = issue_token(tenant, user)
        return client.post('/ask', json=body or {'question':'refund','top_k':3},
                           headers={'Authorization':'Bearer '+token})

    response = client.post('/ask', json={'question':'refund'})
    assert response.status_code == 401
    assert client.post('/ask', json={'question':'refund'},
                       headers={'Authorization':'Bearer forged'}).status_code == 401
    assert ask('team-a','alice').status_code == 200
    assert [h['source'] for h in ask('team-a','alice').json()['sources']] == ['a/returns.md']
    assert [h['source'] for h in ask('team-a','bob').json()['sources']] == ['a/billing.md']
    assert [h['source'] for h in ask('team-b','bob').json()['sources']] == ['b/returns.md']
    assert ask('team-b','alice').json()['sources'] == []
    # The generation boundary must never receive other-tenant excerpts.
    import httpx
    captured = {}
    class StubResponse:
        def raise_for_status(self):
            return None
        def json(self):
            return {'response':'Evidence-backed answer'}
    def stub_generate(url, json, timeout):
        captured['prompt'] = json['prompt']
        return StubResponse()
    monkeypatch.setattr(httpx, 'post', stub_generate)
    response = ask('team-a','alice', {'question':'refund','generate':True})
    assert response.status_code == 200 and response.json()['mode'] == 'local-llm'
    assert 'refund policy' in captured['prompt']
    assert 'private contract for tenant b' not in captured['prompt']
    assert 'billing rules' not in captured['prompt']
    # The body cannot select a tenant or impersonate a user.
    assert ask('team-a','alice', {'question':'refund','tenant':'team-b'}).status_code == 422
    # Policy is reloaded, not cached across requests.
    policy['a/returns.md']['readers'].remove('alice')
    publish()
    revoked = ask('team-a','alice',{'question':'refund','generate':True})
    assert revoked.status_code == 200
    assert revoked.json()['sources'] == []
    assert revoked.json()['answer'] == 'No authorized evidence.'
    # Malformed policy fails closed instead of falling back to all documents.
    policy_file.write_text('{bad')
    assert ask('team-a','alice').status_code == 503
    monkeypatch.delenv('DOCS_ACL_FILE')
    assert ask('team-a','alice').status_code == 503
