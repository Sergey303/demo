import pytest
from app.agent import Agent, Action


def test_draft_requires_approval(tmp_path):
    agent = Agent(tmp_path)
    action = Action('draft_note', {'text': 'Hello'})
    assert agent.execute(action)['status'] == 'approval_required'
    assert not (tmp_path / 'agent_draft.txt').exists()
    assert agent.execute(action, approved=True)['status'] == 'written'


def test_no_traversal(tmp_path):
    agent = Agent(tmp_path)
    with pytest.raises(ValueError):
        agent.execute(Action('read_document', {'name': '../secret.txt'}))


def test_no_unlisted_tool(tmp_path):
    with pytest.raises(ValueError):
        Agent(tmp_path).execute(Action('run_shell', {'command': 'pwd'}), approved=True)


def test_list_read(tmp_path):
    (tmp_path / 'guide.txt').write_text('Information', encoding='utf8')
    agent = Agent(tmp_path)
    assert agent.execute(Action('list_documents', {}))['documents'] == ['guide.txt']
    assert agent.execute(Action('read_document', {'name': 'guide.txt'}))['content'] == 'Information'


def test_http_caller_cannot_approve_its_own_write(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    monkeypatch.setenv('AGENT_DOCUMENTS', str(tmp_path))
    client = TestClient(app)
    payload = {'tool': 'draft_note', 'arguments': {'text': 'untrusted'}}
    response = client.post('/execute', json={**payload, 'approved': True})
    assert response.status_code == 422
    response = client.post('/execute', json=payload)
    assert response.status_code == 200
    assert response.json()['status'] == 'approval_required'
    assert not (tmp_path / 'agent_draft.txt').exists()

def test_http_read_only_tools_remain_available(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    monkeypatch.setenv('AGENT_DOCUMENTS', str(tmp_path))
    (tmp_path / 'guide.txt').write_text('safe')
    response = TestClient(app).post('/execute', json={'tool':'read_document','arguments':{'name':'guide.txt'}})
    assert response.status_code == 200 and response.json()['content'] == 'safe'
