import json
from hashlib import sha256
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
from audio_worker import process_audio, search_result


class Encoder:
    def encode(self, texts):
        return [[1.,0.] if 'refund' in text.lower() else [0.,1.] for text in texts]


def tiny_wav():
    # Sufficient for the injected-transcriber contract; no actual decode here.
    return b'RIFF' + bytes(4) + b'WAVE' + bytes(40)


def fake_transcriber(_):
    return [{'source':'input.wav','start':0.,'end':1.,'text':'refund terms'},
            {'source':'input.wav','start':1.,'end':2.,'text':'shipping details'}]


def test_durable_result_contains_source_timestamps_and_vectors():
    blob=tiny_wav()
    result=process_audio(blob,'demo.wav',transcriber=fake_transcriber,encoder=Encoder())
    assert result['sha256']==sha256(blob).hexdigest().upper()
    assert result['source']=='demo.wav'
    assert result['segments'][0]['source']=='demo.wav'
    assert result['segments'][0]['start']==0.
    assert result['segments'][0]['embedding']==[1.,0.]
    assert search_result(result,'refund',Encoder(),k=1)[0]['text']=='refund terms'
    json.dumps(result,allow_nan=False)


def test_zero_speech_has_no_invented_hits():
    result=process_audio(tiny_wav(),'silent.wav',transcriber=lambda _:[],encoder=Encoder())
    assert result['segments']==[]
    assert search_result(result,'refund',Encoder())==[]


def test_invalid_media_rejected():
    with pytest.raises(ValueError):
        process_audio(b'not-wav','x.wav',transcriber=fake_transcriber,encoder=Encoder())
