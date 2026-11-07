"""Opt-in local HTTP + PostgreSQL + Whisper/ONNX end-to-end smoke."""
import base64
from hashlib import sha256
import json
import os
import secrets
import psycopg
from urllib.error import HTTPError
from audio_access import issue_token, revoke_read, AccessDenied
from pathlib import Path
import subprocess
import tempfile
from time import monotonic
from urllib.request import Request, urlopen
from uuid import uuid4
from audio_worker import process_one, fetch_and_search


def submit(base, wav, key, token):
    data = json.dumps({'filename':'sample.wav','wavBase64':base64.b64encode(wav).decode()}).encode()
    request = Request(base+'/audio-jobs',data=data,method='POST',headers={
        'Content-Type':'application/json','Idempotency-Key':key,
        'Authorization':'Bearer '+token})
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
        os.environ.setdefault('DEMO_AUTH_SECRET', secrets.token_urlsafe(40))
        token=issue_token('example-team','alice')
        first, accepted=submit(base,data,key,token)
        second, replay=submit(base,data,key,token)
        assert first==202 and second==200 and accepted['id']==replay['id']
        try:
            submit(base,data,key,issue_token('example-team','bob'))
        except HTTPError as error:
            assert error.code == 409
        else:
            raise AssertionError('Another principal reused the owner idempotency key')
        # Client-supplied identity cannot bypass a signature.
        for denied_token in (issue_token('example-team','bob'), issue_token('other-team','alice')):
            try:
                urlopen(Request(base+'/jobs/'+accepted['id'],
                                headers={'Authorization':'Bearer '+denied_token}), timeout=10)
            except HTTPError as error:
                assert error.code == 404
            else:
                raise AssertionError('Other principal could read audio result')
        # Legacy unauthenticated read must not expose audio transcript or vectors.
        try:
            urlopen(base+'/jobs/'+accepted['id'], timeout=10)
        except HTTPError as error:
            assert error.code == 404, f'Unexpected legacy response: {error.code}'
        else:
            raise AssertionError('Legacy HTTP endpoint disclosed audio content')
        # The authenticated owner can poll status and retrieve the result.
        deadline = monotonic() + 120
        while True:
            get_request = Request(base+'/jobs/'+accepted['id'], headers={'Authorization':'Bearer '+token})
            with urlopen(get_request, timeout=10) as response:
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
        for denied_token in (issue_token('example-team','bob'), issue_token('other-team','alice')):
            try:
                fetch_and_search(dsn, accepted['id'], 'refund', token=denied_token)
            except AccessDenied:
                pass
            else:
                raise AssertionError('Other principal could search audio')
        hits=fetch_and_search(dsn,accepted['id'],'What is the refund period?',k=1,token=token)
        assert hits and hits[0]['source']=='sample.wav' and hits[0]['end']>hits[0]['start']
        # A revoked grant invalidates both search and HTTP result access.
        revoke_read(dsn, accepted['id'], 'example-team', 'alice')
        try:
            fetch_and_search(dsn, accepted['id'], 'refund', token=token)
        except AccessDenied:
            pass
        else:
            raise AssertionError('Revoked principal still accesses retrieval')
        try:
            urlopen(get_request, timeout=10)
        except HTTPError as error:
            assert error.code == 404
        else:
            raise AssertionError('Revoked principal still accesses HTTP result')

        print(json.dumps({'status':'PASS','job_id':accepted['id'],
             'segments':len(job['result']['segments']),'first_hit':hits[0]},indent=2))


if __name__=='__main__':
    main()
