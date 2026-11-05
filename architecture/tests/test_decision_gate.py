import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
from decision_gate import assess


def report():
    cases = [('q1', 'a'), ('q2', 'b'), ('q3', 'c'), ('q4', 'd')]
    def outcome(q, expected, top, rank):
        return {'question':q,'expected':expected,'top':top,'rank':rank}
    base = [outcome(q, e, e if i in (0, 2) else 'wrong', 1 if i in (0, 2) else 2)
            for i,(q,e) in enumerate(cases)]
    candidate = [outcome(q, e, e if i in (0, 1, 3) else 'wrong', 1 if i in (0, 1, 3) else 2)
                 for i,(q,e) in enumerate(cases)]
    return {'questions':4,'baseline':{'top1':2,'median_ms':8,'outcomes':base},
            'reranked':{'top1':3,'median_ms':125,'outcomes':candidate}}


def test_refuses_to_promote_tiny_dataset():
    result=assess(report())
    assert result['decision']=='INSUFFICIENT_EVIDENCE'
    assert (result['fixed'],result['regressions'])==(2,1)
    assert result['top1_gain']==0.25


def test_latency_gate_is_stricter_than_quality_gain():
    assert assess(report(),min_questions=4,min_gain=.2,max_median_ms=100)['decision']=='REJECT_LATENCY'
    assert assess(report(),min_questions=4,min_gain=.2,max_median_ms=130)['decision']=='ELIGIBLE_FOR_FURTHER_REVIEW'


def test_paired_label_mismatch_is_rejected():
    value=report()
    value['reranked']['outcomes'][0]['question']='different'
    with pytest.raises(ValueError,match='differ'):
        assess(value)


def test_aggregates_must_match_evidence():
    value=report()
    value['reranked']['top1']=4
    with pytest.raises(ValueError,match='disagrees'):
        assess(value)


def test_non_finite_policy_is_invalid():
    with pytest.raises(ValueError, match="Invalid decision policy"):
        assess(report(), min_gain=float('nan'))
