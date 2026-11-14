"""HTTP identity contract: no datastore or model is needed."""
from pathlib import Path
import sys
import pytest
from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from audio_access import issue_token
from search_api import app

@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv('DEMO_AUTH_SECRET', 'ep11-unit-only-' + 'x'*40)
    monkeypatch.delenv('JOBS_TEST_CONNECTION', raising=False)
    return TestClient(app)

@pytest.mark.parametrize('tenant,subject', [('team','alice'),('team','bob'),('other','alice')])
def test_signed_identity_only(client, tenant, subject):
    response=client.get('/agent/identity?tenant=forged&subject=forged',
        headers={'Authorization':'Bearer '+issue_token(tenant,subject), 'Cookie':'subject=forged'})
    assert response.status_code==200
    assert response.json()==dict(tenant=tenant,subject=subject,identity_kind='local_demo')
    assert response.headers['cache-control']=='no-store'

@pytest.mark.parametrize('authorization', [None, 'Bearer forged', 'Basic nonsense'])
def test_identity_denied(client, authorization):
    response=client.get('/agent/identity',headers={} if authorization is None else {'Authorization':authorization})
    assert response.status_code==401
    assert response.headers['cache-control']=='no-store'


def test_unconfigured_signer_fails_closed(client, monkeypatch):
    token=issue_token('team','alice')
    monkeypatch.delenv('DEMO_AUTH_SECRET', raising=False)
    response=client.get('/agent/identity',headers={'Authorization':'Bearer '+token})
    assert response.status_code==503
    assert response.json()=={'detail':'Local auth unavailable'}
    assert response.headers['cache-control']=='no-store'
