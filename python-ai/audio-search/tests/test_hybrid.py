import pytest
from search import TranscriptIndex
from hybrid import HybridIndex

class FakeEncoder:
    def encode(self, texts):
        return [[1.,0.] if 'refund' in t.lower() else [0.,1.] for t in texts]


def test_hybrid_merges_at_source_level_without_duplicate_votes():
    data=[{'source':'a.wav','start':0.,'end':1.,'text':'refund help'},
          {'source':'a.wav','start':1.,'end':2.,'text':'refund information'},
          {'source':'b.wav','start':0.,'end':2.,'text':'shipping parcels'}]
    hybrid=HybridIndex(TranscriptIndex(data,FakeEncoder()))
    hits=hybrid.search('refund',k=3)
    assert [h.source for h in hits]==['a.wav','b.wav']
    assert hits[0].start in (0.,1.)


def test_no_lexical_match_does_not_create_sparse_votes():
    docs=[{'source':'one.wav','start':0.,'end':1.,'text':'alpha'},
          {'source':'two.wav','start':0.,'end':1.,'text':'beta'}]
    hybrid=HybridIndex(TranscriptIndex(docs,FakeEncoder()))
    assert hybrid.lexical_scores('unrelatedword')==[0,0]
    assert [x.source for x in hybrid.search('unrelatedword')]==[x.source for x in hybrid.neural.search('unrelatedword')]


def test_bad_rrf_k():
    with pytest.raises(ValueError): HybridIndex(TranscriptIndex([],FakeEncoder()),rrf_k=0)
