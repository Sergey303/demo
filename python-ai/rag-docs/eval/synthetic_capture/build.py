"""Deterministic SYNTHETIC NON-INDEPENDENT recorder fixture; no model calls."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from blind_eval import seal

OUT = Path(__file__).resolve().parent


def build(prior):
    # Frozen invented policies, not retrieved documents or independent labels.
    specs = [
        ('amber', 'Where is the amber spare key stored?', 'key', 'The amber spare key is stored in locker K4.', True),
        ('amber', 'Which day is the amber lab inspection?', 'inspection', 'The amber lab inspection is on Tuesday.', True),
        ('amber', 'What is the amber sample label prefix?', 'labels', 'Amber sample labels begin with AX.', True),
        ('violet', 'Where is the violet spare key stored?', 'key', 'The violet spare key is stored in cabinet V9.', True),
        ('violet', 'Which day is the violet lab inspection?', 'inspection', 'The violet lab inspection is on Friday.', True),
        ('violet', 'What is the violet sample label prefix?', 'labels', 'Violet sample labels begin with VZ.', True),
        ('amber', 'Who may copy the amber spare key?', 'key', 'The amber spare key is stored in locker K4.', False),
        ('violet', 'How much does a violet lab inspection cost?', 'inspection', 'The violet lab inspection is on Friday.', False),
        ('amber', 'What is the amber centrifuge speed limit?', None, None, False),
        ('violet', 'Who supplies violet microscope lenses?', None, None, False),
        ('amber', 'When will the amber freezer be replaced?', None, None, False),
    ]
    cases = []
    for i, (tenant, question, source, text, answerable) in enumerate(specs, 1):
        source_id = f'{tenant}-{source}' if source else None
        evidence = ([dict(id=source_id, tenant=tenant, version='synthetic-v1', text=text)]
                    if source else [])
        cases.append(dict(
            id=f'synthetic-capture-{i:02}', question=question, tenant=tenant,
            permissions=[source_id] if source else [], evidence=evidence, split='holdout',
            annotation=dict(reviewer='UNREVIEWED',
                provenance='SYNTHETIC NON-INDEPENDENT; developer-authored frozen evidence and labels; holdout solely exercises recorder, never independent evaluation.',
                independent=False, blind=False, adjudicated=False,
                answerable=answerable, abstain=not answerable,
                allowed_source_ids=[source_id] if answerable else [],
                spans=[dict(source=source_id, start=0, end=len(text), quote=text)] if answerable else [])))
    dataset = dict(schema=1, cases=cases)
    return dataset, seal(dataset, prior)


def encoded(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def main():
    prior = json.loads((ROOT / 'eval/prior_exposure.json').read_text(encoding='utf-8'))
    dataset, manifest = build(prior)
    for name, value in [('dataset.json', dataset), ('manifest.json', manifest), ('prior_exposure.json', prior)]:
        (OUT / name).write_text(encoded(value), encoding='utf-8')


if __name__ == '__main__':
    main()
