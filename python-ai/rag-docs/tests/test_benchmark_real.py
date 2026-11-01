import numpy as np
from app.core import Passage
from benchmark_real import evaluate


def test_ann_comparison_and_labeled_recall():
    passages = [Passage('refund.txt','refund'), Passage('security.txt','password'), Passage('ship.txt','delivery')]
    vectors = np.eye(3, dtype=np.float32)
    queries = np.asarray([[1.,0.,0.],[0.,1.,0.]], dtype=np.float32)
    cases = [{'question':'refund','source':'refund.txt'}, {'question':'password','source':'security.txt'}]
    metrics = evaluate(vectors, queries, passages, cases, k=1, ef=8)
    assert metrics['labeled_recall']['exact'] == 1
    assert metrics['labeled_recall']['hnsw'] == 1
    assert metrics['ann_recall_against_exact'] == 1
