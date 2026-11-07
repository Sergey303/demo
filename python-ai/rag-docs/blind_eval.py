"""Offline, hash-bound human annotation and free-form review contracts. No model calls."""
import argparse
import hashlib
import json
import re
from pathlib import Path

STATUS = 'INSUFFICIENT INDEPENDENT EVIDENCE'
ID = re.compile(r'[A-Za-z0-9_.-]{1,100}\Z')


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def fields(obj, names):
    if not isinstance(obj, dict) or set(obj) != set(names.split()):
        raise ValueError('Missing or unexpected fields')


def strings(items):
    if not isinstance(items, list) or any(not isinstance(x, str) or not ID.fullmatch(x) for x in items) or len(set(items)) != len(items):
        raise ValueError('Invalid or duplicate identifiers')


def nonempty(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError('Expected nonempty text')


def validate(dataset):
    fields(dataset, 'schema cases')
    if dataset['schema'] != 1 or not isinstance(dataset['cases'], list) or not dataset['cases']:
        raise ValueError('Empty or invalid dataset')
    ids, questions = set(), set()
    for c in dataset['cases']:
        fields(c, 'id question tenant permissions evidence annotation split')
        strings([c['id'], c['tenant']]); nonempty(c['question'])
        q = ' '.join(c['question'].casefold().split())
        if c['id'] in ids or q in questions:
            raise ValueError('Duplicate case/question across splits')
        ids.add(c['id']); questions.add(q)
        if c['split'] not in ('train', 'dev', 'holdout'):
            raise ValueError('Invalid split')
        strings(c['permissions'])
        if not isinstance(c['evidence'], list):
            raise ValueError('Invalid evidence')
        sources = {}
        for e in c['evidence']:
            fields(e, 'id tenant version text'); strings([e['id'], e['tenant']]); nonempty(e['version']); nonempty(e['text'])
            if e['id'] in sources or e['tenant'] != c['tenant'] or e['id'] not in c['permissions']:
                raise ValueError('Duplicate or unauthorized evidence')
            sources[e['id']] = e
        a = c['annotation']
        fields(a, 'reviewer provenance independent blind adjudicated answerable abstain allowed_source_ids spans')
        nonempty(a['reviewer']); nonempty(a['provenance'])
        for key in ('independent', 'blind', 'adjudicated', 'answerable', 'abstain'):
            if type(a[key]) is not bool:
                raise ValueError('Expected boolean label')
        if a['answerable'] == a['abstain']:
            raise ValueError('Inconsistent answerability')
        strings(a['allowed_source_ids'])
        if not set(a['allowed_source_ids']) <= sources.keys():
            raise ValueError('Label outside evidence permissions')
        if not isinstance(a['spans'], list):
            raise ValueError('Invalid spans')
        seen = set()
        for s in a['spans']:
            fields(s, 'source start end quote')
            if s['source'] not in a['allowed_source_ids'] or type(s['start']) is not int or type(s['end']) is not int:
                raise ValueError('Invalid span')
            text = sources[s['source']]['text']
            if not 0 <= s['start'] < s['end'] <= len(text) or text[s['start']:s['end']] != s['quote']:
                raise ValueError('Span does not match frozen evidence')
            key = (s['source'], s['start'], s['end'])
            if key in seen:
                raise ValueError('Duplicate span')
            seen.add(key)
        if a['answerable'] and not a['spans']:
            raise ValueError('Answerable label needs evidence spans')
    return dataset


def seal(dataset, prior):
    validate(dataset)
    if not isinstance(prior, list) or any(not isinstance(q, str) for q in prior):
        raise ValueError('Prior exposure must be question list')
    exposed = {' '.join(q.casefold().split()) for q in prior}
    if any(c['split'] == 'holdout' and ' '.join(c['question'].casefold().split()) in exposed for c in dataset['cases']):
        raise ValueError('Holdout overlaps exposed questions')
    return {'schema': 1, 'dataset_sha256': digest(dataset), 'prior_sha256': digest(prior),
            'cases': {c['id']: {'sha256': digest(c), 'split': c['split']} for c in dataset['cases']}}


def evaluate(dataset, manifest, prior, outputs, reviews):
    if seal(dataset, prior) != manifest:
        raise ValueError('Seal mismatch')
    if not isinstance(outputs, list) or not outputs or not isinstance(reviews, list):
        raise ValueError('Recorded answers required; reviews must be a list')
    cases = {c['id']: c for c in dataset['cases'] if c['split'] == 'holdout'}
    judgments = {}
    for r in reviews:
        fields(r, 'id output_sha256 reviewer provenance entailed unsupported_claims conflicts')
        strings([r['id']]); nonempty(r['reviewer']); nonempty(r['provenance'])
        if r['reviewer'] == 'UNREVIEWED':
            raise ValueError('Placeholder is not an independent reviewer')
        if r['id'] in judgments or r['id'] not in cases:
            raise ValueError('Duplicate or unknown human review')
        if any(type(r[k]) is not bool for k in ('entailed', 'unsupported_claims', 'conflicts')):
            raise ValueError('Malformed human judgment')
        judgments[r['id']] = r
    rows, seen = [], set()
    for o in outputs:
        fields(o, 'id case_sha256 tenant answer abstained citations evidence claims run')
        if o['id'] not in cases or o['id'] in seen:
            raise ValueError('Duplicate or unknown output')
        seen.add(o['id']); c = cases[o['id']]
        if o['case_sha256'] != digest(c) or o['tenant'] != c['tenant']:
            raise ValueError('Stale case or wrong tenant')
        fields(o['run'], 'model corpus_sha256 policy')
        for v in o['run'].values(): nonempty(v)
        if o['run']['corpus_sha256'] != digest(c['evidence']) or o['run']['policy'] != 'min_score=0.67':
            raise ValueError('Stale corpus or unfrozen policy')
        if type(o['abstained']) is not bool or not isinstance(o['answer'], str):
            raise ValueError('Malformed answer')
        strings(o['citations'])
        if not isinstance(o['evidence'], list):
            raise ValueError('Missing retrieved evidence list')
        # A valid, recorded no-hit retrieval is an empty list and MUST support
        # a genuine refusal; an answer without evidence is always rejected.
        if not o['evidence'] and not o['abstained']:
            raise ValueError('Non-abstained answer without retrieved evidence')
        evidence_ids = []
        for e in o['evidence']:
            if e not in c['evidence']: raise ValueError('Unauthorized, altered or stale evidence')
            evidence_ids.append(e['id'])
        strings(evidence_ids)
        if not set(o['citations']) <= set(evidence_ids):
            raise ValueError('Citation outside authorized retrieved evidence')
        # Only this explicit citation syntax is supported; never interpret markup/URLs.
        inline = re.findall(r'\[\[([^\[\]]*)\]\]', o['answer'])
        strings(inline)
        if set(inline) != set(o['citations']) or o['answer'].count('[[') != len(inline) or o['answer'].count(']]') != len(inline):
            raise ValueError('Malformed or inconsistent inline citations')
        if not isinstance(o['claims'], list): raise ValueError('Missing claim coverage records')
        end = 0
        for claim in o['claims']:
            fields(claim, 'start end citations'); strings(claim['citations'])
            if type(claim['start']) is not int or type(claim['end']) is not int or not end <= claim['start'] < claim['end'] <= len(o['answer']):
                raise ValueError('Invalid or overlapping claim span')
            if o['answer'][end:claim['start']].strip(): raise ValueError('Uncovered answer text')
            end = claim['end']
            if not set(claim['citations']) <= set(o['citations']): raise ValueError('Invalid claim citation')
        issues = []
        if not o['answer'].strip(): issues.append('empty_answer')
        if o['abstained'] != c['annotation']['abstain']: issues.append('answerability_mismatch')
        if o['abstained'] and (o['citations'] or o['claims']): issues.append('abstention_with_claims')
        if not o['abstained'] and (not o['claims'] or o['answer'][end:].strip() or any(not x['citations'] for x in o['claims'])):
            issues.append('incomplete_citation_coverage')
        r = judgments.get(o['id'])
        if r and r['output_sha256'] != digest(o): raise ValueError('Stale human review')
        if r and r['reviewer'] == c['annotation']['reviewer'] and c['annotation']['independent']:
            issues.append('answer_review_not_independent')
        # Entailment applies to substantive answers. For an appropriate
        # abstention, there is no factual answer to entail; reviewers instead
        # check that the refusal matches the frozen answerability annotation.
        if r and ((not o['abstained'] and not r['entailed']) or r['unsupported_claims'] or r['conflicts']):
            issues.append('human_grounding_failure')
        rows.append({'id': o['id'], 'output_sha256': digest(o), 'mechanical_issues': issues,
                     'human_review': r, 'review_required': ['entailment', 'unsupported_claims', 'conflicts'],
                     'case': c, 'recorded_output': o})
    if set(judgments) - seen: raise ValueError('Review without output')
    review_stats = {
        'outputs_recorded': len(rows),
        'human_reviews_recorded': sum(r['human_review'] is not None for r in rows),
        'needs_human_review': sum(r['human_review'] is None for r in rows),
        'records_with_mechanical_or_human_flags': sum(bool(r['mechanical_issues']) for r in rows),
        'recorded_nonentailed_answers': sum(bool(r['human_review'] and not r['human_review']['entailed']
                                             and not r['recorded_output']['abstained']) for r in rows),
        'recorded_unsupported_claims': sum(bool(r['human_review'] and r['human_review']['unsupported_claims']) for r in rows),
        'recorded_conflicts': sum(bool(r['human_review'] and r['human_review']['conflicts']) for r in rows),
    }
    independent = all(all(c['annotation'][k] for k in ('independent', 'blind', 'adjudicated')) and c['annotation']['reviewer'] != 'UNREVIEWED' for c in cases.values())
    positives = sum(c['annotation']['answerable'] for c in cases.values())
    sufficient = len(cases) >= 100 and positives >= 30 and len(cases) - positives >= 30 and independent and seen == set(cases)
    status = STATUS if not sufficient else ('REVIEW_FAILED' if any(r['mechanical_issues'] for r in rows) else 'HUMAN_REVIEW_PENDING' if len(judgments) != len(cases) else 'REVIEW_COMPLETE_NO_PRODUCTION_CLAIM')
    return {'status': status, 'review_stats': review_stats,
            'rows': rows, 'missing_outputs': sorted(set(cases) - seen),
            'note': 'Coverage is syntactic only. Entailment is exclusively a recorded human judgment; identity and independence require external process verification.'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('command', choices=['seal', 'evaluate'])
    for name in ('dataset', 'prior', 'manifest', 'outputs', 'reviews', 'report'):
        p.add_argument('--' + name, type=Path, required=name in ('dataset', 'prior', 'manifest'))
    a = p.parse_args()
    read = lambda path: json.loads(path.read_text(encoding='utf-8'))
    try:
        if a.command == 'seal':
            result = seal(read(a.dataset), read(a.prior))
            with a.manifest.open('x', encoding='utf-8') as f: json.dump(result, f, indent=2)
        else:
            if not a.outputs or not a.reviews: raise ValueError('outputs and reviews required')
            result = evaluate(read(a.dataset), read(a.manifest), read(a.prior), read(a.outputs), read(a.reviews))
        rendered = json.dumps(result, indent=2)
        if a.report: a.report.write_text(rendered + '\n', encoding='utf-8')
        print(rendered)
        if a.command == 'evaluate' and result['status'] != 'REVIEW_COMPLETE_NO_PRODUCTION_CLAIM': return 2
    except (ValueError, OSError, TypeError, KeyError) as exc:
        p.exit(2, f'Invalid evaluation input: {exc}\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
