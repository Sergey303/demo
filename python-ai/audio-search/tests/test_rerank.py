import pytest
from search import Hit
from rerank import RerankedIndex

class Retriever:
    records=[{'text':'a'},{'text':'b'}]
    def search(self, question, k=3):
        return [Hit('a.wav',0.,1.,'first',.8),Hit('b.wav',0.,1.,'second',.7)]

class Ranker:
    def score(self,question,passages):
        return [0.1,0.9]

def test_rerank_changes_order_without_losing_attribution():
    hits=RerankedIndex(Retriever(),Ranker()).search('question',1)
    assert hits[0].source=='b.wav' and hits[0].end==1.

def test_reject_bad_model_response():
    class Bad:
        def score(self,question,passages): return [float('nan')]
    with pytest.raises(ValueError):RerankedIndex(Retriever(),Bad()).search('question')
