"""Offline capture contract tests: no sockets, models, or services."""
import copy
import hashlib
import json
from pathlib import Path
from unittest.mock import Mock

import pytest
import capture_local as cap
from blind_eval import digest, seal


@pytest.fixture
def dataset():
    return json.loads((Path(__file__).resolve().parents[1] / 'eval/blind_development.json').read_text())


def run(dataset, request, manifest=None):
    return cap.capture(dataset, seal(dataset, []) if manifest is None else manifest,
                       [], 'a' * 64, 'demo:fixed', 'http://localhost:11434', 1, request)


def stub(endpoint, method, path, payload=None, timeout=None):
    if path == '/api/tags':
        return {'models': [{'name': 'demo:fixed', 'digest': 'b' * 64}]}
    return {'model': 'demo:fixed', 'done': True, 'response': 'Unannotated raw answer'}


def test_exact_authorized_prompt_and_hashes(dataset):
    extra = copy.deepcopy(dataset['cases'][0])
    extra.update(id='other-case', tenant='other', question='SECRET QUESTION', split='dev')
    extra['evidence'][0].update(tenant='other', text='SECRET OTHER TENANT')
    extra['annotation'].update(spans=[{'source': 'refund', 'start': 0, 'end': 6, 'quote': 'SECRET'}])
    dataset['cases'].append(extra)
    request = Mock(side_effect=stub)
    result = run(dataset, request)
    row = result['records'][0]
    payload = request.call_args.args[3]
    assert payload['options'] == cap.OPTIONS and payload['stream'] is False
    context = json.loads(payload['prompt'].split('\n', 1)[1])
    case = dataset['cases'][0]
    assert context == {k: case[k] for k in ('tenant', 'question', 'evidence')}
    assert 'SECRET' not in payload['prompt'] and 'annotation' not in context
    assert row['status'] == 'GENERATED' and row['model_digest'] == 'b' * 64
    assert row['prompt_sha256'] == hashlib.sha256(row['prompt'].encode()).hexdigest()
    assert row['evidence_sha256'] == digest(case['evidence'])
    assert row['case_sha256'] == digest(case)
    assert row['record_sha256'] == digest({k: v for k, v in row.items() if k != 'record_sha256'})
    assert result['capture_sha256'] == digest({k: v for k, v in result.items() if k != 'capture_sha256'})
    assert cap.prompt_for(case) == cap.prompt_for(copy.deepcopy(case))
    assert digest({'b': 1, 'a': 2}) == digest({'a': 2, 'b': 1})


@pytest.mark.parametrize('change', ['tenant', 'manifest', 'duplicate', 'undeclared', 'prior'])
def test_bad_inputs_never_contact_model(dataset, change):
    manifest = seal(dataset, [])
    if change == 'tenant': dataset['cases'][0]['evidence'][0]['tenant'] = 'other'
    if change == 'manifest': manifest['dataset_sha256'] = 'wrong'
    if change == 'duplicate': dataset['cases'].append(copy.deepcopy(dataset['cases'][0]))
    if change == 'undeclared': dataset['cases'][0]['permissions'] = []
    if change == 'prior': manifest['prior_sha256'] = 'wrong'
    request = Mock()
    with pytest.raises(ValueError): run(dataset, request, manifest)
    request.assert_not_called()


def test_no_hits_no_network(dataset):
    case = dataset['cases'][0]
    case['evidence'] = []
    case['annotation'].update(answerable=False, abstain=True, allowed_source_ids=[], spans=[])
    request = Mock()
    row = run(dataset, request)['records'][0]
    assert row['status'] == 'ABSTAINED_NO_EVIDENCE' and row['response'] is None
    request.assert_not_called()


@pytest.mark.parametrize('response', [{'models': []}, {'models': [{'name': 'demo:fixed'}]}])
def test_missing_model(dataset, response):
    request = Mock(return_value=response)
    with pytest.raises(ValueError, match='absent'): run(dataset, request)
    assert request.call_count == 1


def test_missing_service_and_failed_generation(dataset):
    with pytest.raises(ValueError): run(dataset, Mock(side_effect=ValueError('offline')))
    def fail(endpoint, method, path, payload=None, timeout=None):
        if path == '/api/tags': return stub(endpoint, method, path)
        raise ValueError('private error')
    result = run(dataset, fail)
    assert result['records'][0]['status'] == 'GENERATION_FAILED'
    assert 'private error' not in json.dumps(result)


@pytest.mark.parametrize('url', [
    'http://evil:11434', 'https://localhost:11434', 'http://127.1:11434',
    'http://2130706433:11434', 'http://127.0.0.1.evil:11434',
    'http://localhost@evil:11434', 'http://localhost:11434/redirect',
    'http://localhost:11434?url=http://evil', 'http://[::1]:11434',
    'http://localhost:0', 'http://localhost:65536', 'http://LOCALHOST:11434',
])
def test_ssrf_rejected_before_connection(monkeypatch, url):
    connection = Mock()
    monkeypatch.setattr(cap.http.client, 'HTTPConnection', connection)
    with pytest.raises(ValueError): cap.local_request(url, 'POST', '/api/generate', {})
    connection.assert_not_called()


def transport(monkeypatch, status=200, chunks=None):
    conn = Mock()
    conn.getresponse.return_value.status = status
    conn.getresponse.return_value.read1.side_effect = chunks or [b'{}', b'']
    factory = Mock(return_value=conn)
    monkeypatch.setattr(cap.http.client, 'HTTPConnection', factory)
    return conn, factory


def test_transport_loopback_no_proxy_and_redirect(monkeypatch):
    monkeypatch.setenv('HTTP_PROXY', 'http://remote.invalid')
    conn, factory = transport(monkeypatch, status=302)
    with pytest.raises(ValueError): cap.local_request('http://localhost:11434', 'POST', '/api/generate', {})
    factory.assert_called_once_with('127.0.0.1', 11434, timeout=30)
    assert conn.request.call_count == 1
    conn.close.assert_called_once()


def test_transport_size_timeout_and_invalid_json(monkeypatch):
    monkeypatch.setattr(cap, 'MAX_RESPONSE', 2)
    for chunks in ([b'xxx'], [b'not json', b'']):
        transport(monkeypatch, chunks=chunks)
        with pytest.raises(ValueError): cap.local_request('http://localhost:11434', 'GET', '/api/tags')
    conn, _ = transport(monkeypatch)
    conn.getresponse.side_effect = TimeoutError('secret')
    with pytest.raises(ValueError, match='unavailable'): cap.local_request('http://localhost:11434', 'GET', '/api/tags')
    conn.close.assert_called_once()
    with pytest.raises(ValueError): cap.local_request('http://localhost:11434', 'GET', '/api/tags', timeout=121)


def test_cli_custody_no_overwrite_and_manifest_bytes(dataset, tmp_path, monkeypatch):
    paths = {name: tmp_path / (name + '.json') for name in ('dataset', 'prior', 'manifest', 'output')}
    paths['dataset'].write_text(json.dumps(dataset))
    paths['prior'].write_text('[]')
    paths['manifest'].write_text(json.dumps(seal(dataset, []), indent=3) + '\n')
    args = ['capture_local.py', '--model', 'demo:fixed']
    for name, path in paths.items(): args += ['--' + name, str(path)]
    monkeypatch.setattr('sys.argv', args)
    with pytest.raises(SystemExit): cap.main()
    assert not paths['output'].exists()
    args.append('--allow-unsealing-holdout')
    original = cap.capture
    monkeypatch.setattr(cap, 'capture', lambda *a: original(*a, request=stub))
    assert cap.main() == 0
    raw = paths['output'].read_bytes()
    result = json.loads(raw)
    assert result['manifest_sha256'] == hashlib.sha256(paths['manifest'].read_bytes()).hexdigest()
    with pytest.raises(SystemExit): cap.main()
    assert paths['output'].read_bytes() == raw


@pytest.mark.parametrize('answer', [
    {'model': 'demo:fixed', 'done': False, 'response': 'partial'},
    {'model': 'other:tag', 'done': True, 'response': 'wrong model'},
    {'model': 'demo:fixed', 'done': True, 'response': 'error', 'error': 'private'},
])
def test_incomplete_or_mismatched_generation_not_accepted(dataset, answer):
    def request(endpoint, method, path, payload=None, timeout=None):
        return stub(endpoint, method, path) if path == '/api/tags' else answer
    row = run(dataset, request)['records'][0]
    assert row['status'] == 'GENERATION_FAILED' and row['response'] is None


def test_total_deadline_checked_even_with_successful_read(monkeypatch):
    conn, _ = transport(monkeypatch)
    # Deadline starts at 0, connect completes at 0, first read begins at 31.
    monkeypatch.setattr(cap.time, 'monotonic', Mock(side_effect=[0, 0, 31]))
    with pytest.raises(ValueError):
        cap.local_request('http://localhost:11434', 'GET', '/api/tags', timeout=30)
    conn.close.assert_called_once()


def test_real_loopback_http_transport_not_only_mocks():
    """http.client closes its socket ref for HTTP/1.0; response stays readable."""
    from http.server import BaseHTTPRequestHandler, HTTPServer
    from threading import Thread

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            raw = b'{"models": []}'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def log_message(self, *args):
            pass

    server = HTTPServer(('127.0.0.1', 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        endpoint = f'http://127.0.0.1:{server.server_address[1]}'
        assert cap.local_request(endpoint, 'GET', '/api/tags', timeout=2) == {'models': []}
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)


def test_preflight_failure_clears_empty_reserved_file(dataset, tmp_path, monkeypatch):
    paths = {name: tmp_path / (name + '.json') for name in ('dataset','prior','manifest','output')}
    paths['dataset'].write_text(json.dumps(dataset))
    paths['prior'].write_text('[]')
    paths['manifest'].write_text(json.dumps(seal(dataset, [])))
    arguments = ['capture_local.py','--model','unavailable:local','--allow-unsealing-holdout']
    for name,path in paths.items(): arguments.extend(['--'+name,str(path)])
    monkeypatch.setattr('sys.argv',arguments)
    monkeypatch.setattr(cap, 'capture', lambda *args: (_ for _ in ()).throw(cap.CaptureError('model absent')))
    with pytest.raises(SystemExit) as failure:
        cap.main()
    assert failure.value.code == 2
    assert not paths['output'].exists()
