"""Adversarial-ish small audio retrieval check: multi-topic recordings and absent answer.

Labels written before execution, source-level scoring, no threshold tuning.
Synthetic voices and a tiny corpus cannot imply real-world generalization.
"""
import json
from pathlib import Path
import subprocess
import tempfile
from time import perf_counter
from pipeline import OnnxEncoder, recognize
from search import TranscriptIndex
from semantic_chunks import split_records
from hybrid import HybridIndex

SPEECH = {
 'meeting_a': 'We should revise the return policy next month. The warehouse has received a delayed shipment. The customer may request a refund for damaged items.',
 'meeting_b': 'The service team will issue new password recovery instructions. Billing invoices can be exported at the end of each month. The new staff training begins Monday.',
 'meeting_c': 'Privacy settings allow deletion of personal information. Support tickets must be filed through the online help desk. Shipping routes have changed due to the weather.',
 'meeting_d': 'The annual budget has been approved. Hiring interviews begin on Tuesday. The engineering team will update database backups weekly.',
}
# Relevant files deliberately share vocabulary, and queries paraphrase the speech.
CASES = [
 ('How can damaged products be reimbursed?', 'meeting_a'),
 ('Which recording talks about parcels arriving late?', 'meeting_a'),
 ('What do employees do when they cannot access their account?', 'meeting_b'),
 ('Where is the monthly invoice export discussed?', 'meeting_b'),
 ('Who explains removal of stored personal details?', 'meeting_c'),
 ('Where should people submit a technical assistance request?', 'meeting_c'),
 ('Which discussion mentions recruiting candidates?', 'meeting_d'),
 ('Where is the backup schedule discussed?', 'meeting_d'),
]
ABSENT = 'Which meeting explains how to apply for a driver license?'


def metrics(index, cases, absent):
    results = []
    for question, label in cases:
        hits = index.search(question, k=len(index.records))
        filenames = list(dict.fromkeys(h.source for h in hits))[:3]
        expected = label+'.wav'
        results.append({'question':question,'expected':expected,'rank':next((i+1 for i,f in enumerate(filenames) if f==expected),None), 'top':filenames[0], 'top_score':hits[0].score})
    unknown = index.search(absent, k=1)[0]
    return {'questions':len(cases), 'top1':sum(r['rank']==1 for r in results)/len(results),
            'top3':sum(r['rank'] is not None for r in results)/len(results),
            'failures':[r for r in results if r['rank']!=1],
            'all_results':results,
            'unanswerable':{'question':absent,'returned_source':unknown.source,'score':unknown.score,
                            'correct_abstention':False}}


def main():
    with tempfile.TemporaryDirectory(prefix='audio-challenge-') as tmp:
        folder=Path(tmp); records=[]; seconds=0
        for name,speech in SPEECH.items():
            text_path=folder/(name+'.txt'); text_path.write_text(speech)
            audio=folder/(name+'.wav')
            subprocess.run(['ffmpeg','-nostdin','-loglevel','error','-f','lavfi',
                            '-i',f'flite=textfile={text_path}:voice=slt','-ar','16000','-ac','1',
                            '-y',str(audio)],check=True,timeout=90)
            start=perf_counter(); items=recognize(audio); seconds+=perf_counter()-start
            if not items:raise AssertionError(f'No transcription from {name}')
            records.extend(items)
        encoder=OnnxEncoder()
        index=TranscriptIndex(records,encoder)
        report=metrics(index,CASES,ABSENT)
        split=split_records(records)
        split_index=TranscriptIndex(split,encoder)
        split_report=metrics(split_index,CASES,ABSENT)
        report['hybrid'] = metrics(HybridIndex(index),CASES,ABSENT)
        report['hybrid_sentence'] = metrics(HybridIndex(split_index),CASES,ABSENT)
        report['sentence_chunking']={'passages':len(split), 'metrics':split_report}
        report.update({'recordings':len(SPEECH),'segments':len(records),'transcription_seconds':round(seconds,3),
                       'limits':'Four generated single-speaker recordings; no independent human audio. Source-level labels only; unknown-answer test has no abstention support.'})
        print(json.dumps(report,indent=2))

if __name__=='__main__':main()
