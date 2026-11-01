from evaluate_challenges import CASES, ABSENT, SPEECH, metrics

class FakeIndex:
    records = [None] * 4
    def search(self, question, k=3):
        from types import SimpleNamespace
        expected=next((label for q,label in CASES if q==question),'meeting_a')
        return [SimpleNamespace(source=expected+'.wav',score=0.8)]

def test_challenge_labels_and_out_of_domain_report():
    assert len(CASES)==8 and len(SPEECH)==4
    report=metrics(FakeIndex(),CASES,ABSENT)
    assert report['top1']==1 and report['top3']==1
    assert report['unanswerable']['correct_abstention'] is False
