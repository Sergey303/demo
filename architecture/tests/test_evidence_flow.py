import json
from hashlib import sha256
from pathlib import Path
import pytest
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from evidence_flow import run, local_url


class Encoder:
    def encode(self, texts):
        return [[1., 0.] if 'refund' in x else [0., 1.] for x in texts]


def transcribe(file):
    return [{'source':file.name,'start':0.,'end':2.,'text':'refund instructions'}]


class StubApi:
    def __init__(self):
        self.jobs = {}
        self.posts = 0

    def __call__(self, url, *, payload=None, key=None):
        if payload is not None:
            self.posts += 1
            value = payload['text']
            if key in self.jobs:
                assert self.jobs[key][0] == value
                return 200, {'id':self.jobs[key][1]}
            self.jobs[key] = (value, '00000000-0000-0000-0000-000000000001')
            return 202, {'id':self.jobs[key][1]}
        value, jid = next(iter(self.jobs.values()))
        return 200, {'id':jid, 'status':'done', 'result':{'Sha256':sha256(value.encode()).hexdigest().upper(), 'WordCount':len(value.split())}}


def test_end_to_end_contract_and_idempotent_replay():
    api = StubApi()
    a = run([Path('a.wav')], 'refund',transcriber=transcribe,encoder=Encoder(),transport=api)
    b = run([Path('a.wav')], 'refund',transcriber=transcribe,encoder=Encoder(),transport=api)
    assert a['job_id'] == b['job_id']
    assert a['top_hits'][0]['source'] == 'a.wav'
    assert a['top_hits'][0]['start'] == 0
    assert len(api.jobs) == 1 and api.posts == 2


def test_no_empty_audio_upload():
    api=StubApi()
    with pytest.raises(ValueError,match='No speech'):
        run([Path('empty.wav')], 'question',transcriber=lambda _:[],encoder=Encoder(),transport=api)
    assert api.posts == 0


def test_rejects_nonlocal_host():
    for base in ('https://example.com','http://example.com:5077','http://localhost:5077@evil.com:5077', 'http://localhost:5077/path'):
        with pytest.raises(ValueError):local_url(base)


def test_refuses_corrupt_durable_result():
    def bad(url, *,payload=None,key=None):
        if payload: return 202, {'id':'job'}
        return 200, {'id':'job','status':'done','result':{'Sha256':'wrong','WordCount':1}}
    with pytest.raises(RuntimeError,match='Persisted digest'):
        run([Path('a.wav')],'refund',transcriber=transcribe,encoder=Encoder(),transport=bad)


def test_rejects_oversized_transcript_before_post():
    api=StubApi()
    with pytest.raises(ValueError,match='2000'):
        run([Path('a.wav')],'refund',transcriber=lambda p:[{'source':p.name,'start':0,'end':1,'text':'x'*2000}],encoder=Encoder(),transport=api)
    assert api.posts == 0


def test_silent_recording_does_not_initialize_embedding_model(monkeypatch):
    import pipeline
    def must_not_initialize():
        raise AssertionError('Embedding model loaded before durable acceptance')
    monkeypatch.setattr(pipeline, 'OnnxEncoder', must_not_initialize)
    with pytest.raises(ValueError, match='No speech'):
        run([Path('silence.wav')], 'refund', transcriber=lambda _: [])
