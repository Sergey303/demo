"""Small, reproducible spoken-document retrieval evaluation.

Audio is synthesized from independently authored topic passages; this is not a
representative human-speech benchmark. Uses real Whisper and ONNX embeddings.
"""
from dataclasses import asdict
import json
from pathlib import Path
import subprocess
import tempfile
from time import perf_counter
from pipeline import OnnxEncoder, recognize
from search import TranscriptIndex

EXAMPLES = [
    ('returns', 'Customers can return purchased products within thirty days for a refund.', 'How do I get my money back?'),
    ('delivery', 'Standard shipping usually arrives within five business days.', 'When will my parcel arrive?'),
    ('security', 'To reset your account password, use the recovery email link.', 'I forgot my login password. What now?'),
    ('billing', 'Invoices can be downloaded from the billing section of your account.', 'Where can I find my invoice?'),
    ('privacy', 'You can request removal of personal information in privacy settings.', 'How can I erase my personal data?'),
    ('support', 'Technical support answers requests through the help desk portal.', 'How can I contact support?'),
]


def measure(records, cases, encoder):
    index = TranscriptIndex(records, encoder)
    outcomes = []
    search_durations = []
    for source, _, question in cases:
        start = perf_counter()
        hits = index.search(question, k=3)
        search_durations.append((perf_counter()-start)*1000)
        names = [h.source for h in hits]
        outcomes.append({'expected': source+'.wav', 'question': question,
                         'top_sources': names, 'hit_at_1':bool(names and names[0] == source+'.wav'),
                         'hit_at_3':source+'.wav' in names})
    n=len(outcomes)
    return {'questions':n, 'recall_at_1':sum(x['hit_at_1'] for x in outcomes)/n,
            'recall_at_3':sum(x['hit_at_3'] for x in outcomes)/n,
            'search_ms_p50':sorted(search_durations)[n//2], 'cases':outcomes}


def main():
    with tempfile.TemporaryDirectory(prefix='audio-eval-') as tmp:
        folder=Path(tmp)
        records=[]
        durations=[]
        for name, speech, _ in EXAMPLES:
            audio=folder/(name+'.wav')
            textfile=folder/(name+'.txt')
            textfile.write_text(speech, encoding='utf8')
            subprocess.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-f','lavfi',
                            '-i',f'flite=textfile={textfile}:voice=slt','-ar','16000','-ac','1',
                            '-y',str(audio)],check=True,timeout=60)
            start=perf_counter()
            current=recognize(audio)
            durations.append(perf_counter()-start)
            if not current:
                raise AssertionError(f'Whisper found no text in {audio.name}')
            records.extend(current)
        report=measure(records,EXAMPLES,OnnxEncoder())
        report['audio_files']=len(EXAMPLES)
        report['transcribed_segments']=len(records)
        report['transcription_seconds_total']=round(sum(durations),3)
        report['limits']='Six synthetic single-speaker English audio files; no human audio, no generalization claims.'
        print(json.dumps(report,indent=2))


if __name__=='__main__':
    main()
