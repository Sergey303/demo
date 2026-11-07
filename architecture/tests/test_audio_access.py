"""Security regression tests: signatures, tenants, grants and revocation."""
import os
from pathlib import Path
import sys
from uuid import uuid4
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from audio_access import AccessDenied, assign_tenant, grant_read, revoke_read, issue_token, verify_token
from audio_worker import fetch_and_search, process_one

class Encoder:
    def encode(self, texts):
        return [[1.,0.] for _ in texts]


def test_token_signature_expiry_and_claim_forgery(monkeypatch):
    monkeypatch.setenv('DEMO_AUTH_SECRET', 'test-secret-only-do-not-use-in-production-12345')
    good = issue_token('team-a', 'alice', ttl_seconds=30)
    assert verify_token(good) == ('team-a','alice')
    for forged in [None, '', 'broken', good + 'x', 'x' + good[1:]]:
        with pytest.raises(AccessDenied):
            verify_token(forged)
    import base64, json, hashlib, hmac, time
    from audio_access import _encode
    payload = _encode(json.dumps({'tenant':'team-a','sub':'alice','exp':int(time.time())-1}).encode())
    signature = _encode(hmac.new(os.environ['DEMO_AUTH_SECRET'].encode(),payload.encode(),hashlib.sha256).digest())
    with pytest.raises(AccessDenied):
        verify_token(payload+'.'+signature)


def test_missing_signing_secret_is_not_an_anonymous_fallback(monkeypatch):
    monkeypatch.delenv('DEMO_AUTH_SECRET', raising=False)
    with pytest.raises(RuntimeError,match='32 bytes'):
        issue_token('team-a','alice')


def test_tenant_and_revocation_enforced_before_embedding(monkeypatch):
    import psycopg
    cs = os.getenv('JOBS_TEST_CONNECTION')
    if not cs:
        pytest.skip('PostgreSQL not configured')
    monkeypatch.setenv('DEMO_AUTH_SECRET', 'test-secret-only-do-not-use-in-production-12345')
    jid, eid = uuid4(), uuid4()
    with psycopg.connect(cs) as db:
        with db.cursor() as cur:
            cur.execute("""INSERT INTO jobs(id,idempotency_key,payload_sha256,input,status,kind,audio_payload,audio_name)
                           VALUES (%s,%s,%s,'','queued','audio',%s,'isolation.wav')""",
                        (jid,'acl-'+str(jid),'0'*64,b'RIFF'+bytes(4)+b'WAVE'+bytes(40)))
            cur.execute('INSERT INTO outbox(id,job_id) VALUES (%s,%s)', (eid,jid))
        db.commit()
    class NeverEmbed:
        def encode(self, texts):
            raise AssertionError('Embedding model initialized before authorization')
    try:
        assert process_one(cs, processor=lambda *_: {
            'segments':[{'source':'isolation.wav','start':0.,'end':2.,'text':'private refund', 'embedding':[1.,0.]}]
        }) is True
        assign_tenant(cs, jid,'team-a')
        alice=issue_token('team-a','alice')
        bob=issue_token('team-a','bob')
        other=issue_token('team-b','alice')
        for token in (alice,bob,other):
            with pytest.raises(AccessDenied):
                fetch_and_search(cs,jid,'refund',token=token,encoder=NeverEmbed())
        with pytest.raises(AccessDenied):
            grant_read(cs,jid,'team-b','alice')
        with pytest.raises(AccessDenied):
            assign_tenant(cs,jid,'team-b')
        grant_read(cs,jid,'team-a','alice')
        hits=fetch_and_search(cs,jid,'refund',token=alice,encoder=Encoder())
        assert hits[0]['text']=='private refund'
        for token in (bob,other):
            with pytest.raises(AccessDenied):
                fetch_and_search(cs,jid,'refund',token=token,encoder=NeverEmbed())
        revoke_read(cs,jid,'team-a','alice')
        with pytest.raises(AccessDenied):
            fetch_and_search(cs,jid,'refund',token=alice,encoder=NeverEmbed())
        grant_read(cs,jid,'team-a','alice')
        assert fetch_and_search(cs,jid,'refund',token=alice,encoder=Encoder())[0]['source']=='isolation.wav'
    finally:
        with psycopg.connect(cs) as db:
            with db.cursor() as cur:
                cur.execute('DELETE FROM audio_read_grants WHERE job_id=%s',(jid,))
                cur.execute('DELETE FROM outbox WHERE job_id=%s',(jid,))
                cur.execute('DELETE FROM jobs WHERE id=%s',(jid,))
            db.commit()
