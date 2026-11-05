"""Conservative quality/latency gate for retrieval changes (stdlib only).

Consumes evaluate_holdout.py JSON. Not a significance test or a deployment approval.
"""
import argparse
import json
import math
from pathlib import Path


def assess(report, *, min_questions=100, min_gain=0.05, max_median_ms=150.0):
    if not (min_questions >= 1 and 0 <= min_gain <= 1 and math.isfinite(min_gain) and math.isfinite(max_median_ms) and max_median_ms > 0):
        raise ValueError('Invalid decision policy')
    questions = report['questions']
    base, candidate = report['baseline'], report['reranked']
    if not isinstance(questions, int) or questions < 1:
        raise ValueError('Expected a positive query count')
    for version in (base, candidate):
        if len(version['outcomes']) != questions:
            raise ValueError('Outcome count mismatch')
        if version['top1'] != sum(x['rank'] == 1 for x in version['outcomes']):
            raise ValueError('Top-1 summary disagrees with outcomes')
        if not math.isfinite(version['median_ms']) or version['median_ms'] < 0:
            raise ValueError('Invalid query latency')
    paired = list(zip(base['outcomes'], candidate['outcomes']))
    if any(a['question'] != b['question'] or a['expected'] != b['expected'] for a, b in paired):
        raise ValueError('Baseline and candidate questions/labels differ')
    fixes = sum(a['rank'] != 1 and b['rank'] == 1 for a, b in paired)
    regressions = sum(a['rank'] == 1 and b['rank'] != 1 for a, b in paired)
    delta = (fixes - regressions) / questions
    if questions < min_questions:
        decision = 'INSUFFICIENT_EVIDENCE'
    elif delta < min_gain or regressions > fixes:
        decision = 'REJECT_QUALITY'
    elif candidate['median_ms'] > max_median_ms:
        decision = 'REJECT_LATENCY'
    else:
        decision = 'ELIGIBLE_FOR_FURTHER_REVIEW'
    return {'decision': decision, 'questions': questions, 'fixed': fixes,
            'regressions': regressions, 'top1_gain': round(delta, 4),
            'baseline_median_ms': base['median_ms'], 'candidate_median_ms': candidate['median_ms'],
            'note': 'This gate is not a significance test, production SLO, or proof of grounding.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('report', type=Path, help='Output of python-ai/audio-search/evaluate_holdout.py')
    parser.add_argument('--min-questions', type=int, default=100)
    parser.add_argument('--min-gain', type=float, default=0.05)
    parser.add_argument('--max-median-ms', type=float, default=150.0)
    args = parser.parse_args()
    report = json.loads(args.report.read_text(encoding='utf-8'))
    print(json.dumps(assess(report, min_questions=args.min_questions,
                            min_gain=args.min_gain, max_median_ms=args.max_median_ms), indent=2))


if __name__ == '__main__':
    main()
