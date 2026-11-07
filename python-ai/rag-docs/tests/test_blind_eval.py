import copy
import json
from pathlib import Path
import pytest
from blind_eval import digest, seal, evaluate, validate, STATUS

FIXTURE = Path(__file__).resolve().parents[1] / 'eval/blind_development.json'


def inputs():
    d = json.loads(FIXTURE.read_text())
    c = d['cases'][0]
    answer = 'Refunds take 7 days. [[refund]]'
    o = {'id': c['id'], 'case_sha256': digest(c), 'tenant': c['tenant'],
         'answer': answer, 'abstained': False, 'citations': ['refund'],
         'evidence': copy.deepcopy(c['evidence']),
         'claims': [{'start': 0, 'end': len(answer), 'citations': ['refund']}],
         'run': {'model': 'synthetic-recording', 'corpus_sha256': digest(c['evidence']), 'policy': 'min_score=0.67'}}
    return d, o


def test_fixture_and_unreviewed_status():
    d, o = inputs()
    result = evaluate(d, seal(d, []), [], [o], [])
    assert result['status'] == STATUS
    assert result['rows'][0]['human_review'] is None
    assert result['rows'][0]['mechanical_issues'] == []


def test_explicit_human_ungrounded_label():
    d, o = inputs()
    r = {'id': o['id'], 'output_sha256': digest(o), 'reviewer': 'reviewer-2',
         'provenance': 'test only', 'entailed': False, 'unsupported_claims': True, 'conflicts': False}
    result = evaluate(d, seal(d, []), [], [o], [r])
    assert 'human_grounding_failure' in result['rows'][0]['mechanical_issues']
    r['output_sha256'] = 'stale'
    with pytest.raises(ValueError): evaluate(d, seal(d, []), [], [o], [r])


@pytest.mark.parametrize('change', [
    lambda o: o.update(tenant='other'),
    lambda o: o.update(case_sha256='old'),
    lambda o: o.update(evidence=[]),
    lambda o: o['evidence'][0].update(version='old'),
    lambda o: o.update(citations=['../../secret']),
    lambda o: o.update(citations=['refund', 'refund']),
    lambda o: o.update(answer='invented [[unknown]]'),
    lambda o: o.update(answer='[[refund'),
    lambda o: o['run'].update(policy='min_score=0.6'),
    lambda o: o.pop('abstained'),
])
def test_reject_bad_recordings(change):
    d, o = inputs(); change(o)
    with pytest.raises(ValueError): evaluate(d, seal(d, []), [], [o], [])


def test_seal_tampering_exposure_and_duplicates():
    d, _ = inputs(); m = seal(d, [])
    with pytest.raises(ValueError): seal(d, [d['cases'][0]['question'].upper()])
    d['cases'][0]['question'] += ' changed'
    with pytest.raises(ValueError): evaluate(d, m, [], [], [])
    d['cases'].append(copy.deepcopy(d['cases'][0]))
    d['cases'][1]['id'] = 'duplicate-question'
    with pytest.raises(ValueError): validate(d)


@pytest.mark.parametrize('change', [
    lambda c: c['annotation'].pop('reviewer'),
    lambda c: c['annotation'].update(adjudicated='yes'),
    lambda c: c['annotation']['spans'][0].update(quote='fabricated'),
    lambda c: c['annotation'].update(allowed_source_ids=['secret']),
    lambda c: c['evidence'][0].update(tenant='other'),
])
def test_bad_labels(change):
    d, _ = inputs(); change(d['cases'][0])
    with pytest.raises(ValueError): validate(d)


def test_no_outputs_and_duplicate_outputs():
    d, o = inputs(); m = seal(d, [])
    for outputs in ([], [o, o]):
        with pytest.raises(ValueError): evaluate(d, m, [], outputs, [])


def test_coverage_empty_and_abstention():
    d, o = inputs(); m = seal(d, [])
    o.update(answer='', claims=[], citations=[])
    issues = evaluate(d, m, [], [o], [])['rows'][0]['mechanical_issues']
    assert 'empty_answer' in issues and 'incomplete_citation_coverage' in issues
    o.update(abstained=True)
    assert 'answerability_mismatch' in evaluate(d, m, [], [o], [])['rows'][0]['mechanical_issues']


def test_complete_review_gate_requires_independence_balance_and_all_outputs():
    d, example = inputs()
    base = d['cases'][0]
    d['cases'] = []
    outputs, reviews = [], []
    for i in range(100):
        c = copy.deepcopy(base)
        c.update(id=f'case-{i}', question=f'Independent collection contract test {i}?')
        c['annotation'].update(reviewer='annotator', provenance='Synthetic test only',
                               independent=True, blind=True, adjudicated=True,
                               answerable=i < 50, abstain=i >= 50)
        d['cases'].append(c)
        o = copy.deepcopy(example)
        o.update(id=c['id'], case_sha256=digest(c))
        if i >= 50:
            o.update(answer='Insufficient authorized evidence.', abstained=True, citations=[], claims=[])
        outputs.append(o)
        reviews.append({'id':c['id'], 'output_sha256':digest(o), 'reviewer':'answer-reviewer',
                        'provenance':'Synthetic gate test', 'entailed':True,
                        'unsupported_claims':False, 'conflicts':False})
    m = seal(d, [])
    assert evaluate(d, m, [], outputs, reviews)['status'] == 'REVIEW_COMPLETE_NO_PRODUCTION_CLAIM'
    assert evaluate(d, m, [], outputs, [])['status'] == 'HUMAN_REVIEW_PENDING'
    assert evaluate(d, m, [], outputs[:-1], [])['status'] == STATUS
    reviews[0]['unsupported_claims'] = True
    assert evaluate(d, m, [], outputs, reviews)['status'] == 'REVIEW_FAILED'
    d['cases'][0]['annotation']['independent'] = False
    outputs[0]['case_sha256'] = digest(d['cases'][0])
    assert evaluate(d, seal(d, []), [], outputs, [])['status'] == STATUS


def test_checked_in_seal_and_cli_reject_missing_outputs():
    import subprocess
    import sys
    folder = FIXTURE.parent
    d = json.loads(FIXTURE.read_text())
    prior = json.loads((folder / 'prior_exposure.json').read_text())
    assert seal(d, prior) == json.loads((folder / 'blind_development.manifest.json').read_text())
    result = subprocess.run([sys.executable, str(folder.parent / 'blind_eval.py'), 'evaluate',
                             '--dataset', str(FIXTURE), '--prior', str(folder / 'prior_exposure.json'),
                             '--manifest', str(folder / 'blind_development.manifest.json')],
                            capture_output=True, text=True)
    assert result.returncode == 2
    assert 'outputs and reviews required' in result.stderr


def test_no_hit_abstention_and_human_entailment_not_applicable():
    d, o = inputs()
    case = d['cases'][0]
    case['annotation'].update(answerable=False, abstain=True,
                              allowed_source_ids=[], spans=[])
    o.update(case_sha256=digest(case), answer='Insufficient authorized evidence.',
             abstained=True, citations=[], claims=[], evidence=[])
    review = {'id': o['id'], 'output_sha256': digest(o),
              'reviewer':'reviewer-2', 'provenance':'synthetic offline test',
              'entailed':False, 'unsupported_claims':False, 'conflicts':False}
    report = evaluate(d, seal(d, []), [], [o], [review])
    assert report['rows'][0]['mechanical_issues'] == []
    o['abstained'] = False
    with pytest.raises(ValueError, match='without retrieved evidence'):
        evaluate(d, seal(d, []), [], [o], [])


def test_recorded_synthetic_sample_is_a_review_queue_not_evidence():
    folder = FIXTURE.parent
    d = json.loads(FIXTURE.read_text())
    prior = json.loads((folder / 'prior_exposure.json').read_text())
    outputs = json.loads((folder / 'blind_recording.synthetic.json').read_text())
    reviews = json.loads((folder / 'blind_reviews.synthetic.json').read_text())
    result = evaluate(d, seal(d, prior), prior, outputs, reviews)
    assert result['status'] == STATUS
    assert result['review_stats']['outputs_recorded'] == 1
    assert result['review_stats']['human_reviews_recorded'] == 0
    assert result['review_stats']['needs_human_review'] == 1
    assert result['rows'][0]['mechanical_issues'] == []


def test_independent_answer_review_requires_different_reviewer():
    d, o = inputs()
    case = d['cases'][0]
    case['annotation'].update(reviewer='person-1', independent=True)
    o['case_sha256'] = digest(case)
    review = {'id':o['id'], 'output_sha256':digest(o), 'reviewer':'person-1',
              'provenance':'test', 'entailed':True,
              'unsupported_claims':False, 'conflicts':False}
    result = evaluate(d, seal(d, []), [], [o], [review])
    assert 'answer_review_not_independent' in result['rows'][0]['mechanical_issues']


def test_unreviewed_placeholder_cannot_close_human_review():
    d, o = inputs()
    r = {'id':o['id'], 'output_sha256':digest(o), 'reviewer':'UNREVIEWED',
         'provenance':'synthetic', 'entailed':True, 'unsupported_claims':False,
         'conflicts':False}
    with pytest.raises(ValueError, match='Placeholder'):
        evaluate(d, seal(d, []), [], [o], [r])
