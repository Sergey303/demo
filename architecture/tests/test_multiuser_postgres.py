"""Shared disposable PostgreSQL + real MCP stdio, scripted model, synthetic vectors.

No Qwen/ONNX quality claim. Each host invocation starts the real fixed server.
"""
import asyncio
import json
import os
from pathlib import Path
import sys
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from audio_access import AccessDenied, issue_token, revoke_read
import agent_actions
import mcp_agent_host as host
from test_search_postgres import connection, insert, delete

QUESTION='When can customers request a refund?'
MARKERS=('ALICE_PRIVATE_REVIEW_MARKER', 'BOB_PRIVATE_REVIEW_MARKER',
         'OTHER_TENANT_PRIVATE_REVIEW_MARKER')
QUOTES=tuple('Customers may request a refund within 30 days under the '+marker+' policy.'
             for marker in MARKERS)

class Model:
    def __init__(self, *, revoke=None, forged=False):
        self.calls=[]
        self.revoke=revoke
        self.forged=forged

    async def __call__(self, messages, tools):
        self.calls.append(json.loads(json.dumps(messages)))
        if len(self.calls)==2 and self.revoke:
            self.revoke()
        if tools is None:
            return {'content':json.dumps({'answer':'The deadline is 30 days.',
                                         'citation_ids':['E1'],'abstain':False})}
        name=tools[0]['function']['name']
        if name=='search_evidence':
            args={'question':QUESTION,'top_k':2}
            if self.forged:
                args['subject']='bob'
        else:
            args={'job_id':json.loads(messages[-1]['content'])['citations'][0]['job_id'],
                  'note':'Review refund policy.'}
        return {'tool_calls':[{'function':{'name':name,'arguments':args}}]}

@pytest.fixture
def corpus(monkeypatch):
    dsn=connection()
    monkeypatch.setenv('DEMO_AUTH_SECRET','ep11-disposable-only-'+'x'*40)
    # A real stdio subprocess cannot inherit a monkeypatched encoder.
    # The trusted test entrypoint substitutes only encoder initialization.
    jobs=[]
    for index,(tenant,subject) in enumerate([('ep11-team','alice'),('ep11-team','bob'),('ep11-other','alice')]):
        jobs.append(insert(dsn,'document',tenant,subject+'-'+tenant+'.md',QUOTES[index],[.6,.8],subject=subject))
    yield dsn,jobs
    delete(dsn,jobs)

def query(monkeypatch, dsn, tenant, subject, model, task='answer'):
    # Only encoder loading is replaced in this trusted test server. The host
    # still uses official MCP stdio with its fixed tool catalog and env token.
    monkeypatch.setattr(host,'SERVER',Path(__file__).with_name('multiuser_mcp_fixture.py'))
    return asyncio.run(host.run_agent(QUESTION,task,issue_token(tenant,subject),dsn,model=model))

def assert_private_text(value, own=None):
    """Check actual source text, including any nested tool trace or evidence."""
    serialized=json.dumps(value)
    for marker in MARKERS:
        if marker==own:
            assert marker in serialized
        else:
            assert marker not in serialized


def test_profiles_sql_context_and_owner_bound_approval(monkeypatch,corpus):
    dsn,jobs=corpus
    for index,(tenant,subject,job) in enumerate([('ep11-team','alice',jobs[0]),('ep11-team','bob',jobs[1]),('ep11-other','alice',jobs[2])]):
        for task in ('answer','note'):
            model=Model()
            result=query(monkeypatch,dsn,tenant,subject,model,task)
            assert result['status']==('answered' if task=='answer' else 'approval_required'),result
            assert [c['job_id'] for c in result['citations']]==[str(job)]
            assert result['citations'][0]['quote']==QUOTES[index]
            assert_private_text(model.calls,MARKERS[index])
            assert_private_text(result,MARKERS[index])
            context=json.dumps(model.calls)
            assert all(str(other) not in context for other in jobs if other!=job)
            assert os.environ['DEMO_AUTH_SECRET'] not in context and dsn not in context
            if index==0 and task=='note':
                pending=result['pending']
    for tenant,subject in [('ep11-team','bob'),('ep11-other','alice')]:
        with pytest.raises(AccessDenied):
            agent_actions.confirm(dsn,tenant,subject,pending['approval_token'],'approve')
    assert agent_actions.confirm(dsn,'ep11-team','alice',pending['approval_token'],'approve')['status']=='written'
    assert len(agent_actions.list_notes(dsn,'ep11-team','alice',str(jobs[0])))==1
    revoke_read(dsn,jobs[0],'ep11-team','alice')
    assert agent_actions.list_notes(dsn,'ep11-team','alice',str(jobs[0]))==[]

@pytest.mark.parametrize('task',['answer','note'])
def test_revoke_during_model_and_before_retrieval(monkeypatch,corpus,task):
    dsn,jobs=corpus
    model=Model(revoke=lambda:revoke_read(dsn,jobs[0],'ep11-team','alice'))
    result=query(monkeypatch,dsn,'ep11-team','alice',model,task)
    assert result['abstained'] and result['citations']==[] and 'pending' not in result
    assert agent_actions.list_notes(dsn,'ep11-team','alice',str(jobs[0]))==[]
    # The already-authorized prompt can contain Alice's source before revoke;
    # the returned refusal must contain no private source text at all.
    assert_private_text(model.calls,MARKERS[0])
    assert_private_text(result)
    model=Model()
    result=query(monkeypatch,dsn,'ep11-team','alice',model,task)
    assert result['abstained'] and result['citations']==[] and len(model.calls)==1
    assert str(jobs[0]) not in json.dumps(model.calls)
    assert_private_text(model.calls)
    assert_private_text(result)

def test_model_cannot_select_principal_and_forged_token_fails(monkeypatch,corpus):
    dsn,jobs=corpus
    model=Model(forged=True)
    result=query(monkeypatch,dsn,'ep11-team','alice',model)
    assert result['abstained'] and result['tool_trace']==[] and len(model.calls)==1
    with pytest.raises(AccessDenied):
        asyncio.run(host.run_agent(QUESTION,'answer','forged',dsn,model=Model()))
