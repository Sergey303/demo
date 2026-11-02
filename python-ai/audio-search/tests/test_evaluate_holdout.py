from types import SimpleNamespace
from evaluate_holdout import CASES, SPEECH, check

class FixtureIndex:
    records = [None] * 3
    def search(self, question, k):
        expected = next(name for query, name in CASES if query == question)
        return [SimpleNamespace(source=expected+'.wav')]


def test_holdout_labels_and_rank_metrics():
    assert len(SPEECH) == 6
    assert len(CASES) == 12
    result = check(FixtureIndex(), CASES)
    assert result['top1'] == len(CASES)
    assert result['top3'] == len(CASES)
    assert len(result['outcomes']) == len(CASES)
