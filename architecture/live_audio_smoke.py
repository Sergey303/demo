"""Opt-in local HTTP + PostgreSQL + Whisper/ONNX end-to-end smoke."""
import base64
from hashlib import sha256
import json
import os
from pathlib import Path
import subprocess
import tempfile
from time import monotonic
from urllib.request import Request, urlopen
from uuid import uuid4
from audio_worker import process_one, fetch_and_search


def submit(base, wav, key):
    data = json.dumps({'filename':'sample.wav','wavBase64':base64.b64encode(wav).decode()}).encode()
    request = Request(base+'/audio-jobs',data=data,method='POST',headers={
        'Content-Type':'application/json','Idempotency-Key':key})
    with urlopen(request,timeout=10) as response:
        return response.status,json.load(response)


def main():
    dsn = os.environ.get('JOBS_TEST_CONNECTION')
    if not dsn:
        raise SystemExit('JOBS_TEST_CONNECTION must point to disposable PostgreSQL')
    base = 'http://127.0.0.1:5077'
    with tempfile.TemporaryDirectory() as folder:
        wav = Path(folder)/'sample.wav'
        subprocess.run(['ffmpeg','-nostdin','-v','error','-f','lavfi',
            '-i',"flite=text='Customers can request a refund within thirty days':voice=slt",
            '-ar','16000','-ac','1','-y',str(wav)],check=True,timeout=40)
        data=wav.read_bytes()
        assert len(data)<=262_144, 'WAV exceeds demo limit'
        key='demo-audio-'+str(uuid4())
        first, accepted=submit(base,data,key)
        second, replay=submit(base,data,key)
        assert first==202 and second==200 and accepted['id']==replay['id']
        deadline = monotonic() + 120
        while True:
            with urlopen(base+'/jobs/'+accepted['id'],timeout=10) as response:
                job=json.load(response)
            if job['status'] == 'done':
                break
            if job['status'] == 'failed':
                raise RuntimeError('Audio worker marked accepted job as failed')
            if monotonic() > deadline:
                raise TimeoutError('Audio job did not finish in 120 seconds')
            if not process_one(dsn):
                raise RuntimeError('Accepted audio job was not available for claim')
        assert job['result']['sha256']==sha256(data).hexdigest().upper()
        hits=fetch_and_search(dsn,accepted['id'],'What is the refund period?',k=1)
        assert hits and hits[0]['source']=='sample.wav' and hits[0]['end']>hits[0]['start']
        print(json.dumps({'status':'PASS','job_id':accepted['id'],
             'segments':len(job['result']['segments']),'first_hit':hits[0]},indent=2))


if __name__=='__main__':
    main()
