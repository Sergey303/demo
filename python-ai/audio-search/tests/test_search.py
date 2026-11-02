import pytest
from core import Segment, passages
from search import TranscriptIndex


class Encoder:
    def __init__(self):
        self.batch_sizes = []
    def encode(self, texts):
        self.batch_sizes.append(len(texts))
        return [[1.,0.] if 'refund' in text.lower() else [0.,1.] for text in texts]


def test_multifile_semantic_search_and_timestamps():
    rows = (passages([Segment(0,2,'refund policy'), Segment(2,4,'delivery')], 'a.wav')
          + passages([Segment(0,3,'refund request')], 'b.wav'))
    encoder = Encoder()
    index = TranscriptIndex(rows, encoder, batch_size=2)
    hits = index.search('refund', k=2)
    assert [(x.source,x.start,x.end) for x in hits] == [('a.wav',0,2),('b.wav',0,3)]
    assert index.search('refund', source='b.wav')[0].text == 'refund request'
    assert encoder.batch_sizes[:2] == [2,1]


def test_reject_invalid_encoder_and_overlapping_records():
    rows = passages([Segment(0,2,'ok')], 'a.wav')
    class Broken:
        def encode(self, texts): return [[float('nan')]] * len(texts)
    with pytest.raises(ValueError): TranscriptIndex(rows, Broken())
    with pytest.raises(ValueError): TranscriptIndex(rows + [{'source':'a.wav','start':1,'end':3,'text':'overlap'}], Encoder())


def test_empty_index_and_invalid_query():
    index = TranscriptIndex([], Encoder())
    assert index.search('refund') == []
    with pytest.raises(ValueError): index.search(' ')
    with pytest.raises(ValueError): index.search('refund', k=0)


def test_reject_zero_embeddings_in_index_and_query():
    class Zero:
        def encode(self, texts): return [[0.,0.] for _ in texts]
    rows = passages([Segment(0,1,'refund')], 'a.wav')
    with pytest.raises(ValueError, match='nonzero norm'):
        TranscriptIndex(rows, Zero())
    class QueryZero:
        def encode(self, texts):
            return [[0.,0.] if x == 'question' else [1.,0.] for x in texts]
    index = TranscriptIndex(rows, QueryZero())
    with pytest.raises(ValueError, match='nonzero norm'):
        index.search('question')
