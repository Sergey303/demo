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


def test_whisper_model_is_loaded_once_for_multiple_files(monkeypatch, tmp_path):
    import sys
    from types import SimpleNamespace
    import numpy as np
    import pipeline

    calls = []
    class Model:
        def transcribe(self, pcm, **kwargs):
            assert pcm.dtype == np.float32
            return [SimpleNamespace(start=0., end=1., text='spoken')], None
    def create(name, device, compute_type):
        calls.append((name, device, compute_type))
        return Model()
    monkeypatch.setitem(sys.modules, 'faster_whisper', SimpleNamespace(WhisperModel=create))
    monkeypatch.setattr(pipeline.subprocess, 'run', lambda *args, **kwargs: SimpleNamespace(stdout=np.zeros(16000,dtype=np.float32).tobytes()))
    for name in ('a.wav','b.wav'):
        (tmp_path/name).write_bytes(b'dummy')
    pipeline._whisper_model.cache_clear()
    try:
        pipeline.recognize(tmp_path/'a.wav', model_name='test-local')
        pipeline.recognize(tmp_path/'b.wav', model_name='test-local')
        assert calls == [('test-local','cpu','int8')]
    finally:
        pipeline._whisper_model.cache_clear()
