import json
from contextlib import nullcontext
import httpx
import pytest
from fastapi.testclient import TestClient
from app import main

@pytest.fixture
def boundary(monkeypatch, tmp_path):
    policy = tmp_path / 'acl.json'
    policy.write_text(json.dumps({'a.md': {'tenant': 'a', 'readers': ['alice']},
                                  'private.md': {'tenant': 'b', 'readers': ['bob']}}))
    monkeypatch.setenv('DOCS_ACL_FILE', str(policy))
    monkeypatch.setenv('OLLAMA_URL', 'http://127.0.0.1:11434')
    principal = ['a', 'alice']
    monkeypatch.setattr(main, 'verify_token', lambda token: tuple(principal))
    hits = [{'source': 'a.md', 'passage': 'Allowed excerpt.', 'score': .8}]
    class KB:
        def search(self, question, top_k, allowed_sources):
            return [h for h in hits if h['source'] in allowed_sources]
    monkeypatch.setattr(main, 'knowledge_base', KB)
    envelope = {'done': True, 'done_reason': 'stop', 'response': json.dumps(
        {'answer': 'Supported prose.', 'citations': ['a.md'], 'abstain': False})}
    calls = []
    def stream(method, url, **kwargs):
        calls.append((url, kwargs))
        return nullcontext(httpx.Response(200, json=envelope, request=httpx.Request(method, url)))
    monkeypatch.setattr(httpx, 'stream', stream)
    client = TestClient(main.app)
    def ask(**changes):
        body = {'question': 'What does it say?', 'answer_mode': 'guarded', 'generate': True}
        body.update(changes)
        return client.post('/ask', json=body, headers={'Authorization': 'Bearer test'})
    return ask, hits, envelope, calls, principal, policy

def abstain(response, reason):
    assert response.status_code == 200
    assert response.json() == {'answer': 'ABSTAIN: Insufficient authorized evidence to answer.',
        'sources': [], 'mode': 'guarded', 'abstained': True, 'citations': [], 'reason': reason}

@pytest.mark.parametrize('kind', ['empty', 'low', 'nan', 'tenant', 'revoked'])
def test_pre_generation_gate(boundary, kind):
    ask, hits, _, calls, principal, policy = boundary
    reason = 'no_authorized_sources'
    if kind == 'empty': hits.clear()
    elif kind in ('low', 'nan'):
        hits[0]['score'] = .66 if kind == 'low' else float('nan')
        reason = 'below_relevance_threshold'
    elif kind == 'tenant': principal[:] = ['b', 'alice']
    else: policy.write_text('{}')
    abstain(ask(), reason)
    assert not calls

def test_valid_answer_and_payload(boundary):
    ask, hits, _, calls, _, _ = boundary
    hits.extend([dict(hits[0]), {'source': 'private.md', 'passage': 'SECRET', 'score': 1.}])
    assert ask().json() == {'answer': 'Supported prose.', 'citations': ['a.md'],
        'sources': [], 'mode': 'guarded', 'abstained': False,
        'reason': 'citation syntax/authorization validated, semantic faithfulness unverified'}
    payload = calls[0][1]['json']
    assert payload['think'] is False and payload['stream'] is False
    assert payload['format'] == 'json'
    assert payload['options'] == {'temperature': 0, 'num_predict': 256}
    assert 'Allowed excerpt.' in payload['system'] and 'SECRET' not in str(payload)
    assert payload['system'].count('"source": "a.md"') == 1
    assert calls[0][1]['follow_redirects'] is False
    assert calls[0][1]['trust_env'] is False

@pytest.mark.parametrize('output', ['{bad', '', '[]', '{}',
    *[json.dumps(value) for value in [
        {'answer': 'secret', 'citations': c, 'abstain': False}
        for c in [[], ['private.md'], ['forged.md'], ['a.md', 'a.md']]]],
    *[json.dumps({'answer': a, 'citations': ['a.md'], 'abstain': b})
      for a, b in [('', False), (7, False), ('secret', 0), ('x'*4001, False), ('secret', True)]],
    '{"answer":"secret","citations":[],"abstain":true,"extra":1}',
    '{"answer":"secret","answer":"other","citations":[],"abstain":true}'])
def test_invalid_output(boundary, output):
    ask, _, envelope, _, _, _ = boundary
    envelope['response'] = output
    abstain(ask(), 'invalid_model_output')

@pytest.mark.parametrize('changes', [{'done': False}, {'done': 1}, {'done_reason': 'length'}, {'done_reason': None}])
def test_truncation(boundary, changes):
    ask, _, envelope, _, _, _ = boundary
    envelope.update(changes)
    abstain(ask(), 'invalid_model_output')

def test_model_abstention(boundary):
    ask, _, envelope, _, _, _ = boundary
    envelope.pop('done_reason')
    envelope['response'] = json.dumps({'answer': 'Speculation', 'citations': [], 'abstain': True})
    abstain(ask(), 'model_abstained')

def test_request_constraints(boundary):
    ask, _, _, calls, _, _ = boundary
    assert ask(generate=False).status_code == 422
    for field in ('tenant', 'sources', 'min_score'):
        assert ask(**{field: 'override'}).status_code == 422
    assert not calls

@pytest.mark.parametrize('url', ['https://example.org', 'http://localhost:11434@evil.example', 'http://localhost:11434/path'])
def test_local_only(boundary, monkeypatch, url):
    ask, _, _, calls, _, _ = boundary
    monkeypatch.setenv('OLLAMA_URL', url)
    assert ask().status_code == 400
    assert not calls

def test_missing_completion_flag(boundary):
    ask, _, envelope, _, _, _ = boundary
    envelope.pop('done')
    abstain(ask(), 'invalid_model_output')


def test_missing_stop_reason_is_accepted(boundary):
    ask, _, envelope, _, _, _ = boundary
    envelope.pop('done_reason')
    assert ask().json()['abstained'] is False


def test_guarded_still_requires_identity_and_current_policy(boundary, monkeypatch):
    ask, _, _, calls, _, policy = boundary
    client = TestClient(main.app)
    body = {'question': 'q', 'answer_mode': 'guarded', 'generate': True}
    assert client.post('/ask', json=body).status_code == 401
    policy.write_text('{bad')
    assert ask().status_code == 503
    assert not calls


def test_transport_errors_are_private(boundary, monkeypatch):
    ask, _, _, _, _, _ = boundary
    def fail(*args, **kwargs):
        raise httpx.ConnectError('SECRET private output')
    monkeypatch.setattr(httpx, 'stream', fail)
    response = ask()
    assert response.status_code == 503
    assert response.json() == {'detail': 'Local LLM unavailable'}


def test_non_json_envelope_is_invalid_output(boundary, monkeypatch):
    ask, _, _, _, _, _ = boundary
    monkeypatch.setattr(httpx, 'stream', lambda method, url, **kwargs: nullcontext(httpx.Response(
        200, text='SECRET malformed envelope', request=httpx.Request(method, url))))
    abstain(ask(), 'invalid_model_output')


def test_invalid_lone_surrogate_never_causes_http_500(boundary):
    ask, _, envelope, _, _, _ = boundary
    envelope['response'] = json.dumps({'answer': '\ud800', 'citations': ['a.md'], 'abstain': False})
    abstain(ask(), 'invalid_model_output')


def test_oversize_http_envelope_rejected_before_json_parse(boundary, monkeypatch):
    ask, _, _, _, _, _ = boundary
    from app.guarded import MAX_ENVELOPE_BYTES
    def oversized(method, url, **kwargs):
        content = b'{' + b' ' * (MAX_ENVELOPE_BYTES + 1) + b'}'
        return nullcontext(httpx.Response(200, content=content, request=httpx.Request(method, url)))
    monkeypatch.setattr(httpx, 'stream', oversized)
    abstain(ask(), 'invalid_model_output')
