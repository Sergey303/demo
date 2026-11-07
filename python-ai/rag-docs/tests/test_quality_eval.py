"""Grounding, refusal and score-evaluation contract tests."""
import json
import math

import pytest
from fastapi.testclient import TestClient
from app.core import KnowledgeBase, Passage
from app.evidence import decide_evidence, NO_EVIDENCE
from app import main as rag_api
from quality_eval import assess_rows, evaluate, validate_cases, quality_gate
from audio_access import issue_token


class TopicEmbedder:
    def encode(self, texts):
        return [[1.,0.] if 'refund' in text.lower() else [0.,1.] for text in texts]


def test_evidence_is_verbatim_cited_excerpt():
    p = {'source':'refunds.md','passage':'The refund window is 14 days.',
         'score':0.92}
    outcome = decide_evidence([p])
    assert outcome.answer == p['passage']
    assert outcome.citations == ['refunds.md']
    assert not outcome.abstained
    assert outcome.reason == 'verbatim_source_excerpt'


def test_abstention_is_explicit_and_has_no_misleading_citations():
    assert decide_evidence([]).answer == NO_EVIDENCE
    outcome = decide_evidence([{'source':'private.md','passage':'secret','score':0.4}])
    assert outcome.abstained and outcome.citations == []
    assert outcome.reason == 'below_relevance_threshold'
    for threshold in [float('nan'), float('inf'), 1.1]:
        with pytest.raises(ValueError):
            decide_evidence([], min_score=threshold)


def test_evidence_api_abstains_and_never_calls_llm(monkeypatch, tmp_path):
    monkeypatch.setenv('DEMO_AUTH_SECRET','integration-test-secret-only-123456789-very-long')
    acl = tmp_path / 'acl.json'
    acl.write_text(json.dumps({'refund.md':{'tenant':'retail','readers':['alice']}}))
    monkeypatch.setenv('DOCS_ACL_FILE',str(acl))
    kb = KnowledgeBase([Passage('refund.md','The refund window is 14 days.'),
                        Passage('private.md','Company private financial information.')],TopicEmbedder())
    monkeypatch.setattr(rag_api,'knowledge_base',lambda:kb)
    import httpx
    monkeypatch.setattr(httpx,'post',lambda *a,**kw: (_ for _ in ()).throw(AssertionError('LLM must not run')))
    client = TestClient(rag_api.app)
    auth = {'Authorization':'Bearer '+issue_token('retail','alice')}
    good = client.post('/ask',headers=auth,json={'question':'refund','answer_mode':'evidence'})
    assert good.status_code == 200
    assert good.json()['answer'] == 'The refund window is 14 days.'
    assert good.json()['citations'] == ['refund.md']
    assert good.json()['sources'][0]['source'] == 'refund.md'
    # Even with an authorized document, a low-similarity question refuses
    # rather than citing a top-k result just because retrieval found one.
    low = client.post('/ask',headers=auth,json={'question':'shipping','answer_mode':'evidence'})
    assert low.status_code == 200
    assert low.json()['abstained'] and low.json()['sources'] == []
    assert low.json()['citations'] == []
    assert client.post('/ask',headers=auth,json={'question':'refund','answer_mode':'evidence','generate':True}).status_code == 422
    acl.write_text(json.dumps({'refund.md':{'tenant':'retail','readers':[]}}))
    denied = client.post('/ask',headers=auth,json={'question':'refund','answer_mode':'evidence'})
    assert denied.status_code == 200 and denied.json()['abstained']
    assert denied.json()['sources'] == [] and denied.json()['citations'] == []


def test_metrics_detect_false_answer_wrong_source_and_leak():
    rows = [
        dict(expected='a',predicted='a',abstained=False,permitted=['a'],
             answer='alpha',retrieved_passage='alpha'),
        dict(expected='a',predicted=None,abstained=True,permitted=['a'],
             answer=NO_EVIDENCE,retrieved_passage='alpha'),
        dict(expected='a',predicted='b',abstained=False,permitted=['a'],
             answer='invented',retrieved_passage='beta'),
        dict(expected=None,predicted='b',abstained=False,permitted=['b'],
             answer='beta',retrieved_passage='beta'),
        dict(expected=None,predicted=None,abstained=True,permitted=['b'],
             answer=NO_EVIDENCE,retrieved_passage='beta')
    ]
    report = assess_rows(rows)
    assert report['correct_source_answers'] == 1
    assert report['false_abstentions'] == 1
    assert report['wrong_source_answers'] == 1
    assert report['false_answers'] == 1
    assert report['correct_abstentions'] == 1
    assert report['unauthorized_disclosures'] == 1
    assert report['nonverbatim_answers'] == 1


def test_frozen_dataset_is_valid_and_evaluator_is_reproducible():
    class ConstantEncoder:
        def encode(self, texts):
            return [[1., 0.] for _ in texts]
    a = evaluate(ConstantEncoder())
    b = evaluate(ConstantEncoder())
    assert a == b
    assert a['metrics']['questions'] == 28
    assert a['metrics']['unauthorized_disclosures'] == 0
    assert a['metrics']['nonverbatim_answers'] == 0
    assert any(r['expected'] is None for r in a['rows'])
    with pytest.raises(ValueError):
        validate_cases([{'id':'duplicate'}],{}, {})


def test_gate_cannot_promote_tiny_or_false_positive_dataset():
    metrics = {'questions': 28, 'answerable':14, 'unanswerable_or_inaccessible':14,
               'answerable_success_rate':0.9286, 'negative_rejection_rate':0.7857,
               'false_answers': 3, 'wrong_source_answers': 1,
               'unauthorized_disclosures': 0, 'nonverbatim_answers': 0}
    gate = quality_gate(metrics)
    assert gate['status'] == 'NOT_ELIGIBLE'
    assert set(gate['violations']) == {
        'unsupported_answers', 'wrong_evidence_source', 'insufficient_sample_size',
        'insufficient_abstention_recall'
    }
    metrics.update(questions=120, answerable=60, unanswerable_or_inaccessible=60,
                   false_answers=0, wrong_source_answers=0,
                   negative_rejection_rate=1.0)
    assert quality_gate(metrics)['status'] == 'REQUIRES_INDEPENDENT_REVIEW'
    metrics['unauthorized_disclosures'] = 1
    assert 'cross_tenant_disclosure' in quality_gate(metrics)['violations']


def test_gate_does_not_reward_refusing_every_answer():
    metrics = {'questions': 120, 'answerable': 60, 'unanswerable_or_inaccessible': 60,
               'answerable_success_rate': 0.0, 'negative_rejection_rate': 1.0,
               'false_answers': 0, 'wrong_source_answers': 0,
               'unauthorized_disclosures': 0, 'nonverbatim_answers': 0}
    assert 'insufficient_answerable_recall' in quality_gate(metrics)['violations']
