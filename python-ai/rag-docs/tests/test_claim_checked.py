import json
import pytest
from test_guarded import boundary


def claim(text='Allowed excerpt.', source='a.md', quote=None):
    return dict(text=text, source=source, quote=text if quote is None else quote)


def check(response, reason='invalid_model_output'):
    assert response.status_code == 200
    value = response.json()
    assert value['mode'] == 'claim_checked' and value['abstained']
    assert value['reason'] == reason
    assert value['sources'] == value['citations'] == []
    assert 'a.md' not in str(value)
    assert value['answer'].startswith('ABSTAIN:')


def test_claims(boundary):
    ask, hits, env, calls, *_ = boundary
    hits.extend([dict(hits[0]), dict(source='a.md', passage='Second café 🌍', score=.8)])
    for claims in ([claim()], [claim(), claim('Second café 🌍')]):
        env['response'] = json.dumps(dict(claims=claims, abstain=False))
        assert ask(answer_mode='claim_checked').json() == dict(
            answer='\n'.join(c['text'] for c in claims), sources=[], citations=['a.md'],
            mode='claim_checked', abstained=False,
            reason='exact-span provenance validated; semantic relevance not independently verified')
    assert calls[0][0].endswith('/api/generate')


@pytest.mark.parametrize('claims', [[], [claim()]*2, [claim(str(i)) for i in range(5)],
    [claim('paraphrase', quote='Allowed excerpt.')], [claim('forged')],
    [claim('Allowed excerpt. extra')], [claim(source='private.md')],
    [claim(quote='excerpt. Allowed')], [claim(), claim('forged')],
    [dict(claim(), extra=True)], [claim('')], [claim('\ud800')],
    [claim(source=1)], [None], 'wrong', [claim('x'*4001)]])
def test_invalid(boundary, claims):
    ask, _, env, *_ = boundary
    env['response'] = json.dumps(dict(claims=claims, abstain=False))
    check(ask(answer_mode='claim_checked'))


@pytest.mark.parametrize('raw', ['{', '[]', '{}', '{"claims":[],"abstain":true,"extra":0}',
    '{"claims":[],"abstain":true,"abstain":false}', '{"claims":[],"abstain":0}', 'x'*16385])
def test_schema(boundary, raw):
    ask, _, env, *_ = boundary
    env['response'] = raw
    check(ask(answer_mode='claim_checked'))


@pytest.mark.parametrize('kind', ['empty', 'low', 'tenant', 'truncated', 'refused'])
def test_gates(boundary, kind):
    ask, hits, env, calls, principal, _ = boundary
    env['response'] = json.dumps(dict(claims=[claim()], abstain=False))
    reason = 'no_authorized_sources'
    if kind == 'empty': hits.clear()
    elif kind == 'low':
        hits[0]['score'] = .66
        reason = 'below_relevance_threshold'
    elif kind == 'tenant': principal[:] = ['b', 'alice']
    elif kind == 'truncated':
        env['done_reason'] = 'length'
        reason = 'invalid_model_output'
    else:
        env['response'] = '{"claims":[],"abstain":true}'
        reason = 'model_abstained'
    check(ask(answer_mode='claim_checked'), reason)
    if kind in ('empty', 'low', 'tenant'): assert not calls


def test_no_join_and_input_limit(boundary):
    ask, hits, env, calls, *_ = boundary
    assert ask(answer_mode='claim_checked', generate=False).status_code == 422
    hits[:] = [dict(source='a.md', passage=p, score=.8) for p in ['first', 'second']]
    env['response'] = json.dumps(dict(claims=[claim('firstsecond')], abstain=False))
    check(ask(answer_mode='claim_checked'))
    hits[0]['passage'] = 'x'*70000
    check(ask(answer_mode='claim_checked'), 'invalid_input')


@pytest.mark.parametrize('kind', ['oversize', 'utf8', 'utf16', 'error', 'surrogate', 'empty'])
def test_bounded_transport(boundary, monkeypatch, kind):
    from contextlib import nullcontext
    import httpx
    from app.guarded import MAX_ENVELOPE_BYTES
    ask, _, env, *_ = boundary
    env['response'] = json.dumps(dict(claims=[claim()], abstain=False))
    body = json.dumps(env).encode()
    reason = 'invalid_model_output'
    if kind == 'oversize': body = b' ' * (MAX_ENVELOPE_BYTES + 1)
    elif kind == 'utf8': body = b'\xff'
    elif kind == 'utf16': body = json.dumps(env).encode('utf-16')
    elif kind == 'surrogate':
        env['response'] = json.dumps(dict(claims=[claim('\ud800')], abstain=False))
        body = json.dumps(env).encode()
    elif kind == 'empty': body = b''
    else: reason = 'model_unavailable'
    def stream(method, url, **kwargs):
        if kind == 'error': raise httpx.ConnectError('private detail')
        assert kwargs['follow_redirects'] is False and kwargs['trust_env'] is False
        return nullcontext(httpx.Response(200, content=body, request=httpx.Request(method, url)))
    monkeypatch.setattr(httpx, 'stream', stream)
    check(ask(answer_mode='claim_checked'), reason)


def test_signed_identity_and_revocation(boundary, monkeypatch):
    from app import main, access
    from audio_access import issue_token
    from fastapi.testclient import TestClient
    _, _, env, calls, _, policy = boundary
    monkeypatch.setattr(main, 'verify_token', access.verify_token)
    monkeypatch.setenv('DEMO_AUTH_SECRET', 'unit-test-secret-only-long-enough-for-local-demo')
    env['response'] = json.dumps(dict(claims=[claim()], abstain=False))
    client = TestClient(main.app)
    body = dict(question='q', answer_mode='claim_checked', generate=True)
    def ask(token):
        return client.post('/ask', json=body, headers={'Authorization': 'Bearer '+token})
    assert ask('forged').status_code == 401
    assert ask(issue_token('a', 'alice')).json()['abstained'] is False
    calls.clear()
    check(ask(issue_token('b', 'alice')), 'no_authorized_sources')
    policy.write_text('{}')
    check(ask(issue_token('a', 'alice')), 'no_authorized_sources')
    assert not calls


@pytest.mark.parametrize('url', ['https://example.org', 'http://localhost:11434@evil.example',
                                  'http://localhost:11434/path'])
def test_local_only(boundary, monkeypatch, url):
    ask, _, _, calls, *_ = boundary
    monkeypatch.setenv('OLLAMA_URL', url)
    assert ask(answer_mode='claim_checked').status_code == 400
    assert not calls


def test_full_sentence_required_to_preserve_negation_and_context(boundary):
    ask, hits, env, *_ = boundary
    hits[0]['passage'] = 'This is not safe. The event is on Tuesday.'
    for fragment in ('safe.', 'not safe.', 'on Tuesday.'):
        env['response'] = json.dumps(dict(claims=[claim(fragment)], abstain=False))
        check(ask(answer_mode='claim_checked'))
    for full_sentence in ('This is not safe.', 'The event is on Tuesday.'):
        env['response'] = json.dumps(dict(claims=[claim(full_sentence)], abstain=False))
        assert ask(answer_mode='claim_checked').json()['answer'] == full_sentence
