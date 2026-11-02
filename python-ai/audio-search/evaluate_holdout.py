"""Fixed new-topic holdout: compare unchanged dense retrieval and cross encoder."""
import json
from pathlib import Path
import subprocess
import tempfile
from time import perf_counter
from pipeline import recognize, OnnxEncoder
from rerank import RerankedIndex, CrossEncoderReranker
from search import TranscriptIndex

SPEECH = {
 'garden': 'The botanical garden opens at nine in the morning. Visitors can see rare orchids. Guided tours happen every Saturday.',
 'museum': 'The science museum closes on Monday. Tickets can be reserved online. The planetarium show starts at six in the evening.',
 'clinic': 'The clinic offers vaccinations on Wednesdays. Patients should bring identification. Blood test results arrive within two days.',
 'rail': 'The railway platform was moved near the northern entrance. Trains to the airport leave every forty minutes. Wheelchair assistance must be requested early.',
 'library': 'Borrowed books can be renewed through the catalog. Late fees are waived for children. The reading room closes at eight.',
 'cafe': 'The cafe serves breakfast until eleven. Customers with food allergies can request the ingredient list. Takeaway orders use the side entrance.',
}
CASES = [
 ('Where could I see unusual flowers?', 'garden'),
 ('When can someone join a guided visit of the plants?', 'garden'),
 ('Where do I book admission for the exhibition?', 'museum'),
 ('Which recording mentions an astronomy presentation?', 'museum'),
 ('Where can someone receive immunizations?', 'clinic'),
 ('How soon are laboratory findings available?', 'clinic'),
 ('Where did the boarding location move?', 'rail'),
 ('How regularly can travelers reach the airport?', 'rail'),
 ('How can I extend a loan of printed material?', 'library'),
 ('Do young borrowers pay penalties for overdue items?', 'library'),
 ('Which place offers a list of ingredients for people with allergies?', 'cafe'),
 ('Where can I pick up an order to take away?', 'cafe'),
]

def check(index, cases):
    outcomes=[]; times=[]
    for question, expected in cases:
        start=perf_counter()
        hits=index.search(question,k=len(index.records))
        times.append((perf_counter()-start)*1000)
        sources=list(dict.fromkeys(h.source for h in hits))
        source=expected+'.wav'
        rank=sources.index(source)+1 if source in sources else None
        outcomes.append({'question':question,'expected':source,'top':sources[0], 'rank':rank})
    return {'top1':sum(x['rank']==1 for x in outcomes),'top3':sum(x['rank'] is not None and x['rank']<=3 for x in outcomes),
            'median_ms':round(sorted(times)[len(times)//2],3),'outcomes':outcomes}

def main():
    with tempfile.TemporaryDirectory(prefix='audio-holdout-') as temp:
        folder=Path(temp); records=[]
        for name, speech in SPEECH.items():
            source=folder/(name+'.txt');source.write_text(speech,encoding='utf8')
            audio=folder/(name+'.wav')
            subprocess.run(['ffmpeg','-nostdin','-loglevel','error','-f','lavfi','-i',f'flite=textfile={source}:voice=slt','-ar','16000','-ac','1','-y',str(audio)],check=True,timeout=90)
            records.extend(recognize(audio))
        index=TranscriptIndex(records,OnnxEncoder())
        ranker=RerankedIndex(index,CrossEncoderReranker())
        baseline=check(index,CASES)
        reranked=check(ranker,CASES)
        print(json.dumps({'audio_files':len(SPEECH),'segments':len(records),'questions':len(CASES),
                          'baseline':baseline,'reranked':reranked,
                          'limitations':'New fixed synthetic corpus and questions authored before measurement, not independent human speech or a statistically representative blind set.'},indent=2))

if __name__=='__main__': main()
