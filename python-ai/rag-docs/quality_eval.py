"""Executable frozen-case evaluation of retrieval, quote grounding and abstention.

Does not use a generative LLM or judge. Cases are hand-authored synthetic tests,
not blind real-user relevance ratings. Default threshold is fixed before testing.
"""
import argparse
import json
from pathlib import Path
import sys
from collections import Counter

ROOT = Path(__file__).resolve().parent
from app.core import KnowledgeBase, Passage
from app.evidence import decide_evidence, DEFAULT_MIN_SCORE


def validate_cases(cases, corpus, acl):
    ids = set()
    if not isinstance(cases, list) or not cases:
        raise ValueError('Empty quality case list')
    if not isinstance(corpus, dict) or not isinstance(acl, dict):
        raise ValueError('Invalid corpus or ACL')
    for case in cases:
        if not isinstance(case, dict) or set(case) != {'id','question','tenant','subject','source'}:
            raise ValueError('Malformed test case')
        if case['id'] in ids or not all(isinstance(case[k], str) and case[k] for k in ('id','question','tenant','subject')):
            raise ValueError('Duplicate or malformed case')
        ids.add(case['id'])
        tenant = case['tenant']
        if tenant not in acl or not isinstance(acl[tenant], list) or any(source not in corpus for source in acl[tenant]):
            raise ValueError('Missing tenant ACL')
        if case['source'] is not None and case['source'] not in acl[tenant]:
            raise ValueError('Positive label outside authorized corpus')


def assess_rows(rows):
    if not rows:
        raise ValueError('Expected evaluation rows')
    positives = [r for r in rows if r['expected'] is not None]
    negatives = [r for r in rows if r['expected'] is None]
    correct = sum(not r['abstained'] and r['predicted'] == r['expected'] for r in positives)
    false_abstain = sum(r['abstained'] for r in positives)
    wrong_source = len(positives) - correct - false_abstain
    false_answer = sum(not r['abstained'] for r in negatives)
    true_abstain = len(negatives) - false_answer
    leaked = sum(not r['abstained'] and r['predicted'] not in r['permitted'] for r in rows)
    fabricated = sum(not r['abstained'] and r['answer'] != r['retrieved_passage'] for r in rows)
    return {'questions':len(rows),'answerable':len(positives),'unanswerable_or_inaccessible':len(negatives),
            'correct_source_answers':correct,'false_abstentions':false_abstain,
            'wrong_source_answers':wrong_source,'correct_abstentions':true_abstain,
            'false_answers':false_answer,'unauthorized_disclosures':leaked,
            'nonverbatim_answers':fabricated,
            'answerable_success_rate':round(correct / len(positives), 4) if positives else None,
            'negative_rejection_rate':round(true_abstain / len(negatives), 4) if negatives else None}


def quality_gate(metrics, *, min_cases=100, max_false_answers=0, max_wrong_source=0):
    """Conservative example acceptance policy, not an automatic deploy approval."""
    violations = []
    if metrics['false_answers'] > max_false_answers:
        violations.append('unsupported_answers')
    if metrics['wrong_source_answers'] > max_wrong_source:
        violations.append('wrong_evidence_source')
    if metrics['unauthorized_disclosures'] > 0:
        violations.append('cross_tenant_disclosure')
    if metrics['nonverbatim_answers'] > 0:
        violations.append('ungrounded_nonverbatim_answer')
    if metrics['questions'] < min_cases or metrics['answerable'] < 30 or metrics['unanswerable_or_inaccessible'] < 30:
        violations.append('insufficient_sample_size')
    if metrics['answerable_success_rate'] is None or metrics['answerable_success_rate'] < 0.90:
        violations.append('insufficient_answerable_recall')
    if metrics['negative_rejection_rate'] is None or metrics['negative_rejection_rate'] < 0.95:
        violations.append('insufficient_abstention_recall')
    return {'status':'NOT_ELIGIBLE' if violations else 'REQUIRES_INDEPENDENT_REVIEW',
            'violations':violations,
            'note':'Passing this is never proof of statistical significance or semantic entailment.'}


def evaluate(embedder, *, threshold=DEFAULT_MIN_SCORE, folder=ROOT / 'eval'):
    corpus = json.loads((folder / 'quality_corpus.json').read_text(encoding='utf-8'))
    acl = json.loads((folder / 'quality_acl.json').read_text(encoding='utf-8'))
    cases = json.loads((folder / 'quality_cases.json').read_text(encoding='utf-8'))
    validate_cases(cases, corpus, acl)
    passages = [Passage(name, text) for name,text in sorted(corpus.items())]
    index = KnowledgeBase(passages, embedder)
    rows = []
    for case in cases:
        permitted = set(acl[case['tenant']])
        hits = index.search(case['question'], top_k=1, allowed_sources=permitted)
        decision = decide_evidence(hits, min_score=threshold)
        rows.append({'id':case['id'],'question':case['question'],'expected':case['source'],
                     'predicted':decision.citations[0] if decision.citations else None,
                     'abstained':decision.abstained, 'reason':decision.reason,
                     'score':hits[0]['score'] if hits else None,
                     'baseline_source':hits[0]['source'] if hits else None,
                     'permitted':sorted(permitted),
                     'answer':decision.answer,
                     'retrieved_passage':hits[0]['passage'].strip() if hits else None})
    report = assess_rows(rows)
    baseline_correct = sum(r['baseline_source'] == r['expected'] for r in rows if r['expected'] is not None)
    baseline_false_answers = sum(r['expected'] is None and r['baseline_source'] is not None for r in rows)
    fixed = sum(r['expected'] is None and r['baseline_source'] is not None and r['abstained'] for r in rows)
    regressed = sum(r['expected'] is not None and r['baseline_source'] == r['expected'] and r['abstained'] for r in rows)
    gate = quality_gate(report)
    return {'model':'caller-injected','min_score':threshold,'metrics':report,
            'baseline': {'correct_source_answers':baseline_correct, 'false_answers':baseline_false_answers},
            'paired_comparison': {'false_answers_prevented':fixed, 'previously_correct_sources_abstained':regressed},
            'release_gate': gate,
            'rows':rows, 'warning':'Hand-authored synthetic cases. Source match != answer correctness or entailment; no real-user or model-generation evaluation.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--threshold', type=float, default=DEFAULT_MIN_SCORE)
    parser.add_argument('--output', type=Path, help='Optional local JSON report file')
    parser.add_argument('--enforce-gate', action='store_true', help='Exit nonzero if the conservative deployment gate fails')
    args = parser.parse_args()
    from fastembed import TextEmbedding
    class Encoder:
        def __init__(self):
            self.model = TextEmbedding(model_name='BAAI/bge-small-en-v1.5')
        def encode(self, texts):
            return list(self.model.embed(texts))
    report = evaluate(Encoder(), threshold=args.threshold)
    report['model'] = 'BAAI/bge-small-en-v1.5, local CPU/ONNX'
    serial = json.dumps(report,ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(serial + '\n', encoding='utf-8')
    print(serial)
    if args.enforce_gate and report['release_gate']['status'] != 'REQUIRES_INDEPENDENT_REVIEW':
        raise SystemExit(2)


if __name__ == '__main__':
    main()
