import pytest
from evaluate import retrieval_metrics


def test_retrieval_metrics():
    result = retrieval_metrics([['b', 'a'], ['b', 'a']], ['a', 'b'], k=2)
    assert result['recall_at_2'] == 1
    assert result['mrr_at_2'] == .75


def test_no_empty_eval():
    with pytest.raises(ValueError):
        retrieval_metrics([], [])


def test_lexical_ranking(tmp_path):
    from app.core import Passage
    from evaluate import lexical_rank
    docs = [Passage('a', 'refund returns money'), Passage('b', 'shipping package transit')]
    assert lexical_rank('refund money', docs)[0] == 'a'
    assert lexical_rank('shipping package', docs)[0] == 'b'


def test_top_one_not_trivial():
    assert retrieval_metrics([['b','a']], ['a'], k=1)['recall_at_1'] == 0
