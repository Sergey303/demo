"""Offline synthetic recorder checks; no model, sockets, or downloads."""
import copy
import importlib.util
import json
from pathlib import Path
from unittest.mock import Mock

import pytest
import capture_local
from blind_eval import digest, seal, validate

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'eval/synthetic_capture'
spec = importlib.util.spec_from_file_location('synthetic_capture_build', FIXTURE / 'build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def read(name):
    return json.loads((FIXTURE / name).read_text(encoding='utf-8'))


def test_deterministic_sealed_artifacts():
    prior = read('prior_exposure.json')
    assert prior == json.loads((ROOT / 'eval/prior_exposure.json').read_text())
    first = builder.build(prior)
    assert first == builder.build(prior)
    for name, value in zip(('dataset.json', 'manifest.json'), first):
        assert (FIXTURE / name).read_bytes() == builder.encoded(value).encode()
    assert first[1] == seal(first[0], prior)


def test_mix_and_unreviewed_provenance():
    dataset = validate(read('dataset.json'))
    cases = dataset['cases']
    assert 10 <= len(cases) <= 12
    assert len({c['tenant'] for c in cases}) >= 2
    assert sum(not c['evidence'] for c in cases) >= 3
    assert sum(bool(c['evidence']) and c['annotation']['abstain'] for c in cases) >= 2
    assert sum(c['annotation']['answerable'] for c in cases) >= 4
    for c in cases:
        a = c['annotation']
        assert c['split'] == 'holdout'
        assert a['reviewer'] == 'UNREVIEWED'
        assert 'SYNTHETIC NON-INDEPENDENT' in a['provenance']
        assert all(a[k] is False for k in ('independent', 'blind', 'adjudicated'))
        assert set(a['allowed_source_ids']) <= set(c['permissions'])
        assert all(e['tenant'] == c['tenant'] and e['id'] in c['permissions'] for e in c['evidence'])


@pytest.mark.parametrize('mutation', ['tenant', 'permission', 'allowed_source', 'duplicate', 'exposed'])
def test_reject_invalid_fixture(mutation):
    dataset = copy.deepcopy(read('dataset.json'))
    prior = read('prior_exposure.json')
    c = dataset['cases'][0]
    if mutation == 'tenant': c['evidence'][0]['tenant'] = 'violet'
    if mutation == 'permission': c['permissions'] = []
    if mutation == 'allowed_source': c['annotation']['allowed_source_ids'] = ['violet-key']
    if mutation == 'duplicate': dataset['cases'][1]['question'] = '  ' + c['question'].upper() + '  '
    if mutation == 'exposed': c['question'] = '  ' + prior[0].upper() + '  '
    with pytest.raises(ValueError):
        seal(dataset, prior)
    if mutation == 'exposed':
        with pytest.raises(ValueError):
            builder.build(prior + [builder.build(prior)[0]['cases'][0]['question']])


def test_capture_only_authorized_evidence_and_skip_empty():
    dataset, manifest, prior = read('dataset.json'), read('manifest.json'), read('prior_exposure.json')
    generated = []

    def offline_request(endpoint, method, path, payload=None, timeout=None):
        if path == '/api/tags':
            return {'models': [{'name': 'fixture:stub', 'digest': 'b' * 64}]}
        assert (method, path) == ('POST', '/api/generate')
        context = json.loads(payload['prompt'].split('\n', 1)[1])
        case = next(c for c in dataset['cases'] if c['question'] == context['question'])
        assert case['evidence']
        assert context == {k: case[k] for k in ('tenant', 'question', 'evidence')}
        assert all(e['tenant'] == context['tenant'] and e['id'] in case['permissions'] for e in context['evidence'])
        generated.append(case['id'])
        return {'model': 'fixture:stub', 'done': True, 'response': 'Synthetic stub, not model evidence.'}

    request = Mock(side_effect=offline_request)
    result = capture_local.capture(dataset, manifest, prior, digest(manifest),
                                   'fixture:stub', 'http://localhost:11434', 1, request=request)
    assert generated == [c['id'] for c in dataset['cases'] if c['evidence']]
    assert request.call_count == 1 + len(generated)
    for row, case in zip(result['records'], dataset['cases']):
        assert row['status'] == ('GENERATED' if case['evidence'] else 'ABSTAINED_NO_EVIDENCE')
        if not case['evidence']:
            assert row['response'] is None and row['elapsed_seconds'] == 0
    assert result['review_status'] == 'INSUFFICIENT INDEPENDENT EVIDENCE'
