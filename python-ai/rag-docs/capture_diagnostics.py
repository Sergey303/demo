"""Mechanical-only validation and comparison of raw local LLM captures.

Does not judge entailment, answerability, hallucinations, or human independence.
"""
import argparse
import json
import re
import hashlib
from pathlib import Path

from blind_eval import digest, seal
from capture_local import prompt_for

CITATION = re.compile(r'\[\[([^\[\]]+)\]\]')


def inspect_capture(capture, dataset, manifest, prior):
    if seal(dataset, prior) != manifest:
        raise ValueError('Frozen dataset seal mismatch')
    if capture.get('schema') != 1 or capture.get('kind') != 'RAW_LOCAL_CAPTURE':
        raise ValueError('Not a raw capture')
    if digest({k: v for k, v in capture.items() if k != 'capture_sha256'}) != capture.get('capture_sha256'):
        raise ValueError('Capture hash mismatch')
    if capture.get('manifest_canonical_sha256') != digest(manifest):
        raise ValueError('Canonical manifest mismatch')
    expected = {c['id']: c for c in dataset['cases'] if c['split'] == 'holdout'}
    rows = capture.get('records')
    if not isinstance(rows, list) or len(rows) != len(expected):
        raise ValueError('Incomplete case coverage')
    findings = []
    seen = set()
    for row in rows:
        if not isinstance(row, dict) or row.get('id') not in expected or row['id'] in seen:
            raise ValueError('Unknown or duplicate case')
        seen.add(row['id'])
        case = expected[row['id']]
        if digest({k: v for k, v in row.items() if k != 'record_sha256'}) != row.get('record_sha256'):
            raise ValueError('Record hash mismatch')
        if row.get('case_sha256') != digest(case) or row.get('evidence_sha256') != digest(case['evidence']):
            raise ValueError('Stale frozen evidence')
        if row.get('evidence') != case['evidence'] or row.get('tenant') != case['tenant']:
            raise ValueError('Source or tenant mismatch')
        if row.get('manifest_sha256') != capture.get('manifest_sha256'):
            raise ValueError('Manifest mismatch')
        # A rehashed JSON envelope alone cannot prove the actual request was
        # built from the permitted evidence. Validate frozen prompt bindings.
        expected_prompt = prompt_for(case)
        request = row.get('request')
        if (row.get('prompt') != expected_prompt or not isinstance(request, dict)
                or not isinstance(request.get('payload'), dict)
                or request['payload'].get('prompt') != expected_prompt
                or row.get('prompt_sha256') != hashlib.sha256(expected_prompt.encode('utf-8')).hexdigest()):
            raise ValueError('Recorded prompt does not match authorized evidence')
        response = row.get('response')
        status = row.get('status')
        if status not in ('GENERATED', 'GENERATION_FAILED', 'ABSTAINED_NO_EVIDENCE'):
            raise ValueError('Unknown generation status')
        if not case['evidence'] and (status != 'ABSTAINED_NO_EVIDENCE' or response is not None):
            raise ValueError('No-evidence case must not invoke a model')
        if case['evidence'] and status == 'ABSTAINED_NO_EVIDENCE':
            raise ValueError('Evidence case skipped incorrectly')
        # A failed request may preserve *any* valid JSON returned by a local
        # model, including a list or a non-string response field. Count it as
        # failure without pretending that it was an answer.
        if status == 'GENERATED':
            if not isinstance(response, dict) or not isinstance(response.get('response'), str):
                raise ValueError('Malformed generated answer')
            raw = response['response']
        else:
            raw = response.get('response', '') if isinstance(response, dict) else ''
            if not isinstance(raw, str):
                raw = ''
        refs = CITATION.findall(raw)
        allowed = {x['id'] for x in case['evidence']}
        valid_refs = bool(refs) and len(set(refs)) == len(refs) and set(refs) <= allowed
        valid_refs = valid_refs and raw.count('[[') == len(refs) and raw.count(']]') == len(refs)
        findings.append({
            'id': row['id'], 'status': status, 'elapsed_seconds': row.get('elapsed_seconds'),
            'answer_chars': len(raw), 'response_nonempty': bool(raw.strip()),
            'citation_ids': refs, 'valid_inline_citation': valid_refs,
            'has_evidence': bool(case['evidence']),
            'answerable_label_synthetic': case['annotation']['answerable'],
            'done_reason': response.get('done_reason') if isinstance(response, dict) else None,
            'thinking_disabled': row.get('request', {}).get('payload', {}).get('think') is False
        })
    n = lambda predicate: sum(bool(predicate(r)) for r in findings)
    result = {
        'review_status': 'INSUFFICIENT INDEPENDENT EVIDENCE',
        'records': len(findings),
        'generated': n(lambda r: r['status'] == 'GENERATED'),
        'failed': n(lambda r: r['status'] == 'GENERATION_FAILED'),
        'zero_evidence_abstentions': n(lambda r: r['status'] == 'ABSTAINED_NO_EVIDENCE'),
        'nonempty_generated': n(lambda r: r['status'] == 'GENERATED' and r['response_nonempty']),
        'generated_with_valid_inline_citation': n(lambda r: r['status'] == 'GENERATED' and r['valid_inline_citation']),
        'generated_missing_or_invalid_citation': n(lambda r: r['status'] == 'GENERATED' and not r['valid_inline_citation']),
        'elapsed_generated_seconds': round(sum(r['elapsed_seconds'] for r in findings if r['has_evidence']), 2),
        'rows': findings,
        'warning': 'Citation syntax is mechanical, not factual support. Synthetic labels are not independent human review.'
    }
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--capture', type=Path, required=True)
    p.add_argument('--dataset', type=Path, required=True)
    p.add_argument('--manifest', type=Path, required=True)
    p.add_argument('--prior', type=Path, required=True)
    a = p.parse_args()
    read = lambda path: json.loads(path.read_text(encoding='utf-8'))
    try:
        report = inspect_capture(read(a.capture), read(a.dataset), read(a.manifest), read(a.prior))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        p.exit(2, 'Invalid or incomplete capture; inspect dataset, seal, hashes and record fields.\n')
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
