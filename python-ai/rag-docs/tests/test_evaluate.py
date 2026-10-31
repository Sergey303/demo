import pytest
from evaluate import retrieval_metrics


def test_retrieval_metrics():
    result = retrieval_metrics([['b', 'a'], ['b', 'a']], ['a', 'b'], k=2)
    assert result['recall_at_2'] == 1
    assert result['mrr_at_2'] == .75


def test_no_empty_eval():
    with pytest.raises(ValueError):
        retrieval_metrics([], [])
