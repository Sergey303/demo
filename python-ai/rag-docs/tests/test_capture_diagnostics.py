"""Mechanical raw-capture diagnostics; independent from LLM/human faithfulness."""
import copy
import json
from pathlib import Path

import pytest
from blind_eval import digest
from capture_local import capture
from capture_diagnostics import inspect_capture

DATA = Path(__file__).resolve().parents[1] / 'eval' / 'synthetic_capture'


def fixture():
    read = lambda file: json.loads((DATA / file).read_text(encoding='utf-8'))
    dataset, manifest, prior = read('dataset.json'), read('manifest.json'), read('prior_exposure.json')
    def request(endpoint, method, path, payload=None, timeout=30):
        if path == '/api/tags':
            return {'models': [{'name': 'fake:only', 'digest': 'a' * 64}]}
        content = json.loads(payload['prompt'].split('\n', 1)[1])
        source = content['evidence'][0]['id']
        return {'model':'fake:only','done':True,'done_reason':'stop',
                'response':f'Citation [[{source}]]'}
    result = capture(dataset, manifest, prior, digest(manifest), 'fake:only',
                     'http://127.0.0.1:11434', 10, request=request)
    return result, dataset, manifest, prior


def rehash(capture):
    for row in capture['records']:
        row['record_sha256'] = digest({k:v for k,v in row.items() if k!='record_sha256'})
    capture['capture_sha256'] = digest({k:v for k,v in capture.items() if k!='capture_sha256'})


def test_diagnostics_reports_syntactic_success_without_quality_claims():
    raw, dataset, manifest, prior = fixture()
    result = inspect_capture(raw, dataset, manifest, prior)
    assert result['records'] == 11
    assert result['generated'] == 8
    assert result['failed'] == 0
    assert result['zero_evidence_abstentions'] == 3
    assert result['generated_with_valid_inline_citation'] == 8
    assert result['review_status'] == 'INSUFFICIENT INDEPENDENT EVIDENCE'
    assert 'not factual support' in result['warning']


def test_hash_change_or_wrong_tenant_is_rejected():
    raw, dataset, manifest, prior = fixture()
    bad = copy.deepcopy(raw)
    bad['records'][0]['response']['response'] = 'forged'
    with pytest.raises(ValueError, match='hash'):
        inspect_capture(bad, dataset, manifest, prior)
    bad = copy.deepcopy(raw)
    bad['records'][0]['tenant'] = 'violet'
    rehash(bad)
    with pytest.raises(ValueError, match='Source or tenant mismatch'):
        inspect_capture(bad, dataset, manifest, prior)


def test_no_source_case_cannot_synthesize_answer():
    raw, dataset, manifest, prior = fixture()
    bad = copy.deepcopy(raw)
    row = bad['records'][-1]
    row['status'] = 'GENERATED'
    row['response'] = {'model':'fake:only','done':True,'response':'unsourced'}
    rehash(bad)
    with pytest.raises(ValueError, match='No-evidence'):
        inspect_capture(bad, dataset, manifest, prior)


def test_missing_incomplete_or_duplicate_records_rejected():
    raw, dataset, manifest, prior = fixture()
    bad = copy.deepcopy(raw)
    bad['records'] = bad['records'][:-1]
    rehash(bad)
    with pytest.raises(ValueError, match='Incomplete'):
        inspect_capture(bad, dataset, manifest, prior)
    bad = copy.deepcopy(raw)
    bad['records'][1] = bad['records'][0]
    rehash(bad)
    with pytest.raises(ValueError, match='duplicate'):
        inspect_capture(bad, dataset, manifest, prior)


def test_invalid_citation_is_a_flag_not_semantic_judgment():
    raw, dataset, manifest, prior = fixture()
    bad = copy.deepcopy(raw)
    bad['records'][0]['response']['response'] = 'The answer is known [[source-id]].'
    rehash(bad)
    result = inspect_capture(bad, dataset, manifest, prior)
    assert result['generated_missing_or_invalid_citation'] == 1
    assert not result['rows'][0]['valid_inline_citation']


def test_rehashed_cross_tenant_prompt_tampering_is_rejected():
    import hashlib
    raw, dataset, manifest, prior = fixture()
    row = raw['records'][0]
    row['prompt'] = 'Answer using violet private cabinet V9'
    row['prompt_sha256'] = hashlib.sha256(row['prompt'].encode()).hexdigest()
    row['request']['payload']['prompt'] = row['prompt']
    rehash(raw)
    with pytest.raises(ValueError, match='Recorded prompt does not match authorized evidence'):
        inspect_capture(raw, dataset, manifest, prior)


@pytest.mark.parametrize('unusual_response', [
    ['unexpected-json-list'], {'model': 'fake:only', 'done': True, 'response': 123},
])
def test_preserved_malformed_generation_failure_is_diagnosed(unusual_response):
    raw, dataset, manifest, prior = fixture()
    row = raw['records'][0]
    row['status'] = 'GENERATION_FAILED'
    row['response'] = unusual_response
    rehash(raw)
    report = inspect_capture(raw, dataset, manifest, prior)
    assert report['failed'] == 1
    assert report['generated'] == 7
    assert not report['rows'][0]['response_nonempty']


def test_canonical_manifest_reference_cannot_be_rewritten():
    raw, dataset, manifest, prior = fixture()
    raw['manifest_canonical_sha256'] = 'f' * 64
    rehash(raw)
    with pytest.raises(ValueError, match='Canonical manifest mismatch'):
        inspect_capture(raw, dataset, manifest, prior)
