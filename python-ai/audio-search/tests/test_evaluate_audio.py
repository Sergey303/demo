from evaluate_audio import measure

class Fake:
    def encode(self, texts):
        return [[1.,0.] if 'refund' in x else [0.,1.] for x in texts]

def test_report_recall_is_computed_from_ranks():
    cases=[('returns','', 'refund question'),('delivery','','delivery question')]
    records=[{'source':'returns.wav','start':0.,'end':2.,'text':'refund'},
             {'source':'delivery.wav','start':0.,'end':2.,'text':'delivery'}]
    result=measure(records,cases,Fake())
    assert result['questions']==2
    assert result['recall_at_1']==1
    assert result['recall_at_3']==1
