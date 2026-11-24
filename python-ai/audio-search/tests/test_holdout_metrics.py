import unittest
from unittest.mock import patch
from types import SimpleNamespace
from evaluate_holdout import check


class HoldoutMetricsTests(unittest.TestCase):
    def test_empty_hits_count_as_miss_and_even_median(self):
        class Index:
            records = [None]
            def search(self, question, k):
                return [] if question == 'missing' else [SimpleNamespace(source='a.wav')]
        with patch('evaluate_holdout.perf_counter', side_effect=[0, .002, 1, 1.006]):
            result = check(Index(), [('missing', 'a'), ('found', 'a')])
        self.assertEqual(result['top1'], 1)
        self.assertEqual(result['top3'], 1)
        self.assertIsNone(result['outcomes'][0]['top'])
        self.assertIsNone(result['outcomes'][0]['rank'])
        self.assertEqual(result['median_ms'], 4.0)

    def test_empty_index_no_invalid_k(self):
        class Index:
            records = []
            def search(self, question, k):
                raise AssertionError('empty index must not search with k=0')
        self.assertEqual(check(Index(), [('q', 'a')])['top1'], 0)

    def test_empty_cases_no_claimed_latency(self):
        self.assertIsNone(check(None, [])['median_ms'])


if __name__ == '__main__':
    unittest.main()
