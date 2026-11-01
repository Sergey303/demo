from pathlib import Path
from pipeline import execute


class FakeEncoder:
    def encode(self, texts):
        return [[1.,0.] if 'refund' in x.lower() else [0.,1.] for x in texts]


def fake_transcriber(path):
    return [{'source':path.name, 'start':1., 'end':2., 'text':'refund procedure'}]


def test_audio_pipeline_with_injected_boundaries():
    result = execute([Path('a.wav'),Path('b.wav')], 'refund',
                     transcriber=fake_transcriber, encoder=FakeEncoder())
    assert result['files'] == 2 and result['segments'] == 2
    assert [(x['source'],x['start'],x['end']) for x in result['hits']] == [('a.wav',1.,2.),('b.wav',1.,2.)]


def test_empty_transcript():
    result = execute([Path('silence.wav')], 'anything',
                     transcriber=lambda _: [], encoder=FakeEncoder())
    assert result['hits'] == [] and result['segments'] == 0
