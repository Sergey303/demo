"""Real MCP Python v2 Client<>MCPServer and PostgreSQL approval tests."""
import asyncio
import json
import os
from pathlib import Path
import sys
from uuid import uuid4

import pytest
from mcp import Client

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import agent_actions
import mcp_agent_host as host
import mcp_evidence_server as svc
import unified_search
from audio_access import AccessDenied, issue_token
from test_search_postgres import connection, insert, delete, Encoder


class ScriptedQwen:
    """Tests the real MCP client, never claims to prove actual Ollama inference."""
    def __init__(self, *, job=None, wrong_job=False, force_tool=None):
        self.calls=[]
        self.job=job
        self.wrong_job=wrong_job
        self.force_tool=force_tool

    async def __call__(self, messages, tools):
        self.calls.append({"messages":messages,"tools":tools})
        if tools is None:
            return {"role":"assistant",
                    "content":json.dumps({"answer":"The deadline is 30 days.",
                        "citation_ids":["E1"],"abstain":False})}
        allowed=tools[0]["function"]["name"]
        if self.force_tool:
            allowed=self.force_tool
        if allowed=="search_evidence":
            args={"question":"When can customers request a refund?","top_k":2}
        else:
            data=json.loads(messages[-1]["content"])
            ids={c["job_id"] for c in data["citations"]}
            args={"job_id":str(uuid4()) if self.wrong_job else next(iter(ids)),
                  "note":"Review the 30-day refund deadline."}
        return {"role":"assistant","content":"",
                "tool_calls":[{"function":{"name":allowed,"arguments":args}}]}


def setup(monkeypatch):
    dsn=connection()
    secret="ep09-actual-mcp-test-0123456789abcdefghijklmnopqrstuvwxyz"
    monkeypatch.setenv("DEMO_AUTH_SECRET",secret)
    monkeypatch.setenv("JOBS_TEST_CONNECTION",dsn)
    monkeypatch.setattr(unified_search,"local_encoder",lambda:Encoder())
    token=issue_token("mcp-team","alice")
    monkeypatch.setenv("DEMO_MCP_IDENTITY_TOKEN",token)
    return dsn,token


def run(coro):
    return asyncio.run(coro)


def test_true_mcp_list_tools_and_signed_identity_gate(monkeypatch):
    dsn,token=setup(monkeypatch)
    async def verify():
        async with Client(svc.server,raise_exceptions=True) as client:
            tools=(await client.list_tools()).tools
            assert {t.name for t in tools}==host.TOOL_NAMES
            assert set(tools[0].input_schema["properties"])=={"question","top_k"}
            # SDK v2 ignores unknown keywords at the server boundary. Such
            # values MUST NOT change principal; our host rejects them before
            # forwarding model-selected arguments to MCP.
            ignored=await client.call_tool("search_evidence",{"question":"refund?","tenant":"victim"})
            assert not ignored.is_error
            with pytest.raises(ValueError):
                host._tool_call({"tool_calls":[{"function":{"name":"search_evidence",
                    "arguments":{"question":"refund?","tenant":"victim"}}}]}, "search_evidence")
            monkeypatch.setenv("DEMO_MCP_IDENTITY_TOKEN","forged")
            bad=await client.call_tool("search_evidence",{"question":"refund"})
            assert bad.is_error
    run(verify())


def test_mcp_tool_call_returns_real_sql_citations_and_model_receives_no_secret(monkeypatch):
    dsn,token=setup(monkeypatch)
    job=insert(dsn,"document","mcp-team","policy.md",
               "Customers may request a refund within 30 days.",[.6,.8],subject="alice")
    private=insert(dsn,"document","another-team","secret.md",
                   "Sensitive payroll should never leak.",[.6,.8],subject="alice")
    model=ScriptedQwen()
    try:
        async def scenario():
            async with Client(svc.server) as client:
                return await host.run_agent(
                    "When can customers request a refund?","answer",token,dsn,
                    model=model,mcp_client=client)
        result=run(scenario())
        assert result["status"]=="answered",result
        assert result["answer"]=="The deadline is 30 days."
        assert len(result["citations"])==1
        assert result["citations"][0]["job_id"]==str(job)
        assert [t["tool"] for t in result["tool_trace"]]==["search_evidence"]
        content=json.dumps(model.calls,ensure_ascii=False)
        assert "Sensitive payroll" not in content
        assert secret_not_in_calls(monkeypatch,content)
        assert "JOBS_TEST_CONNECTION" not in content
        assert len(model.calls)==2
        assert model.calls[0]["tools"][0]["function"]["name"]=="search_evidence"
        assert model.calls[1]["tools"] is None
    finally:
        delete(dsn,[job,private])


def secret_not_in_calls(monkeypatch,body):
    return os.environ["DEMO_AUTH_SECRET"] not in body


def test_model_selected_proposal_never_writes_until_explicit_approval(monkeypatch):
    dsn,token=setup(monkeypatch)
    job=insert(dsn,"document","mcp-team","policy.md",
               "Customers may request a refund within 30 days.",[.6,.8],subject="alice")
    model=ScriptedQwen()
    try:
        async def scenario():
            async with Client(svc.server) as client:
                return await host.run_agent(
                  "Find the refund policy, and propose a review note.",
                  "note",token,dsn,model=model,mcp_client=client)
        result=run(scenario())
        assert result["status"]=="approval_required",result
        assert [t["tool"] for t in result["tool_trace"]]==[
            "search_evidence","propose_review_note"]
        assert result["pending"]["job_id"]==str(job)
        assert result["pending"]["note"]=="Review the 30-day refund deadline."
        assert len(model.calls)==2
        # The capability is returned to the trusted host only; not sent to model.
        assert result["pending"]["approval_token"] not in json.dumps(model.calls)
        assert agent_actions.list_notes(dsn,"mcp-team","alice",str(job))==[]
        saved=agent_actions.confirm(dsn,"mcp-team","alice",
                   result["pending"]["approval_token"],"approve")
        assert saved["status"]=="written"
        assert len(agent_actions.list_notes(dsn,"mcp-team","alice",str(job)))==1
        with pytest.raises(AccessDenied):
            agent_actions.confirm(dsn,"mcp-team","alice",
                                  result["pending"]["approval_token"],"approve")
        with pytest.raises(AccessDenied):
            agent_actions.confirm(dsn,"mcp-team","bob",
                                  result["pending"]["approval_token"],"approve")
    finally:
        delete(dsn,[job])


def test_wrong_job_model_output_never_calls_proposal_tool(monkeypatch):
    dsn,token=setup(monkeypatch)
    job=insert(dsn,"document","mcp-team","policy.md",
               "Customers may request a refund within 30 days.",[.6,.8],subject="alice")
    model=ScriptedQwen(wrong_job=True)
    try:
        async def scenario():
            async with Client(svc.server) as client:
                return await host.run_agent("Prepare a note about the refund policy.",
                    "note",token,dsn,model=model,mcp_client=client)
        result=run(scenario())
        assert result["abstained"] and result["reason"]=="invalid_tool_or_model_output"
        assert agent_actions.list_notes(dsn,"mcp-team","alice",str(job))==[]
    finally:
        delete(dsn,[job])


def test_revoke_before_confirmation_and_reject_are_one_use(monkeypatch):
    import psycopg
    dsn,token=setup(monkeypatch)
    job=insert(dsn,"document","mcp-team","policy.md","Refund period is 30 days.",[.6,.8],subject="alice")
    try:
        first=agent_actions.propose(dsn,"mcp-team","alice",str(job),"Review refund policy")
        other=agent_actions.propose(dsn,"mcp-team","alice",str(job),"Do not publish")
        assert agent_actions.confirm(dsn,"mcp-team","alice",other["approval_token"],"reject")["status"]=="rejected"
        with pytest.raises(AccessDenied):
            agent_actions.confirm(dsn,"mcp-team","alice",other["approval_token"],"approve")
        with psycopg.connect(dsn) as db:
            db.execute("DELETE FROM audio_read_grants WHERE job_id=%s",(job,))
            db.commit()
        with pytest.raises(AccessDenied):
            agent_actions.confirm(dsn,"mcp-team","alice",first["approval_token"],"approve")
        assert agent_actions.list_notes(dsn,"mcp-team","alice",str(job))==[]
    finally:
        delete(dsn,[job])


def test_bad_token_and_unauthorized_proposal_are_denied(monkeypatch):
    dsn,token=setup(monkeypatch)
    job=insert(dsn,"document","mcp-team","policy.md","Refund period is 30 days.",[.6,.8],subject="alice")
    try:
        with pytest.raises(AccessDenied):
            agent_actions.propose(dsn,"mcp-team","bob",str(job),"Sneaky write")
        with pytest.raises(AccessDenied):
            agent_actions.confirm(dsn,"mcp-team","alice","malformed","approve")
        with pytest.raises(ValueError):
            agent_actions.propose(dsn,"mcp-team","alice",str(job),"x"*501)
    finally:
        delete(dsn,[job])


def test_read_only_agent_refuses_illegal_model_proposal(monkeypatch):
    dsn,token=setup(monkeypatch)
    job=insert(dsn,"document","mcp-team","policy.md",
        "Customers may request a refund within 30 days.",[.6,.8],subject="alice")
    try:
        async def scenario():
            async with Client(svc.server) as client:
                return await host.run_agent("Refund policy?","answer",token,dsn,
                    model=ScriptedQwen(force_tool="propose_review_note"),mcp_client=client)
        result=run(scenario())
        assert result["abstained"]
        assert result["tool_trace"]==[]
    finally:
        delete(dsn,[job])


def test_concurrent_one_time_approvals_commit_exactly_one_note(monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    dsn,token=setup(monkeypatch)
    job=insert(dsn,"document","mcp-team","policy.md",
               "Customers may request a refund within 30 days.",[.6,.8],subject="alice")
    try:
        approval=agent_actions.propose(dsn,"mcp-team","alice",str(job),"Check deadline")
        barrier=Barrier(2)
        def attempt():
            barrier.wait(timeout=5)
            try:
                return agent_actions.confirm(dsn,"mcp-team","alice",
                                             approval["approval_token"],"approve")["status"]
            except AccessDenied:
                return "denied"
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures=[pool.submit(attempt) for _ in range(2)]
            results=[f.result(timeout=10) for f in futures]
        assert sorted(results)==["denied","written"],results
        assert len(agent_actions.list_notes(dsn,"mcp-team","alice",str(job)))==1
    finally:
        delete(dsn,[job])


def test_expired_approval_and_revocation_during_confirmation_fail_closed(monkeypatch):
    import psycopg
    from concurrent.futures import ThreadPoolExecutor
    from threading import Event
    from time import sleep

    dsn,token=setup(monkeypatch)
    job=insert(dsn,"document","mcp-team","policy.md",
               "Customers may request a refund within 30 days.",[.6,.8],subject="alice")
    try:
        expired=agent_actions.propose(dsn,"mcp-team","alice",str(job),"Expired proposal")
        with psycopg.connect(dsn) as db:
            db.execute("UPDATE agent_note_actions SET expires_at=now()-interval '1 second' WHERE id=%s",
                       (expired["approval_id"],))
            db.commit()
        with pytest.raises(AccessDenied):
            agent_actions.confirm(dsn,"mcp-team","alice",
                                  expired["approval_token"],"approve")

        proposal=agent_actions.propose(dsn,"mcp-team","alice",str(job),"Concurrent revocation")
        with psycopg.connect(dsn) as db:
            db.execute("SELECT 1 FROM audio_read_grants WHERE job_id=%s FOR UPDATE",(job,))
            started=Event()
            def attempt():
                started.set()
                try:
                    agent_actions.confirm(dsn,"mcp-team","alice",
                                           proposal["approval_token"],"approve")
                    return "written"
                except AccessDenied:
                    return "denied"
            with ThreadPoolExecutor(max_workers=1) as pool:
                future=pool.submit(attempt)
                assert started.wait(5)
                sleep(.15)
                # Revoke while confirm is waiting on the locked grant.
                db.execute("DELETE FROM audio_read_grants WHERE job_id=%s",(job,))
                db.commit()
                assert future.result(timeout=10)=="denied"
        assert agent_actions.list_notes(dsn,"mcp-team","alice",str(job))==[]
    finally:
        delete(dsn,[job])


def test_http_mcp_agent_requires_signed_identity_and_one_time_confirm(monkeypatch):
    from fastapi.testclient import TestClient
    from search_api import app

    dsn, token=setup(monkeypatch)
    job=insert(dsn,"document","mcp-team","policy.md",
               "Customers may request a refund within 30 days.",[.6,.8],subject="alice")
    client=TestClient(app)
    try:
        for body in [
            {"question":"refund?","task":"admin"},
            {"question":"refund?","task":"note","tenant":"other"},
            {"question":"refund?","task":"note","approved":True},
        ]:
            assert client.post("/agent/run",json=body,
                 headers={"Authorization":"Bearer "+token}).status_code==422
        assert client.post("/agent/run",json={"question":"refund?"}).status_code==401

        proposal=agent_actions.propose(dsn,"mcp-team","alice",str(job),"Review the policy")
        wrong=issue_token("mcp-team","bob")
        body={"approval_token":proposal["approval_token"],"decision":"approve"}
        assert client.post("/agent/confirm",json=body,
             headers={"Authorization":"Bearer "+wrong}).status_code==404
        approved=client.post("/agent/confirm",json=body,
                 headers={"Authorization":"Bearer "+token})
        assert approved.status_code==200,approved.text
        assert approved.json()["status"]=="written"
        assert client.post("/agent/confirm",json=body,
             headers={"Authorization":"Bearer "+token}).status_code==404
        assert len(client.get(f"/agent/notes/{job}",
            headers={"Authorization":"Bearer "+token}).json()["notes"])==1
        assert client.get(f"/agent/notes/{job}",
            headers={"Authorization":"Bearer "+wrong}).json()["notes"]==[]
    finally:
        delete(dsn,[job])


def test_qwen_requested_five_results_is_safely_clamped_to_mcp_three():
    def call(k):
        return {"tool_calls":[{"function":{
            "name":"search_evidence",
            "arguments":{"question":"refund deadline","top_k":k}
        }}]}
    assert host._tool_call(call(5),"search_evidence")["top_k"]==3
    assert host._tool_call(call(1),"search_evidence")["top_k"]==1
    for invalid in (0,-1,6,3000,True,"5",None):
        with pytest.raises(ValueError):
            host._tool_call(call(invalid),"search_evidence")
    for unexpected in ({"question":"refund","top_k":2,"tenant":"other"},
                       {"question":"refund","top_k":2,"approved":True}):
        with pytest.raises(ValueError):
            host._tool_call({"tool_calls":[{"function":{
                "name":"search_evidence","arguments":unexpected}}]},"search_evidence")


def test_confirm_rechecks_all_original_prompt_sources_not_only_target(monkeypatch):
    import psycopg
    dsn,token=setup(monkeypatch)
    a=insert(dsn,"document","mcp-team","policy-a.md",
             "Customers may request a refund within 30 days.",[.6,.8],subject="alice")
    b=insert(dsn,"document","mcp-team","policy-b.md",
             "Customers must keep invoices for audit purposes.",[.6,.8],subject="alice")
    try:
        proposal=agent_actions.propose(
            dsn,"mcp-team","alice",str(a),
            "Review both documents for refund handling.",
            source_job_ids=[str(a),str(b)])
        with psycopg.connect(dsn) as db:
            originals=db.execute("SELECT source_job_ids FROM agent_note_actions WHERE id=%s",
                                 (proposal["approval_id"],)).fetchone()[0]
        assert set(originals)=={a,b}
        with psycopg.connect(dsn) as db:
            db.execute("DELETE FROM audio_read_grants WHERE job_id=%s",(b,))
            db.commit()
        with pytest.raises(AccessDenied):
            agent_actions.confirm(dsn,"mcp-team","alice",
                                  proposal["approval_token"],"approve")
        assert agent_actions.list_notes(dsn,"mcp-team","alice",str(a))==[]
        with pytest.raises(AccessDenied):
            agent_actions.propose(dsn,"mcp-team","alice",str(a),"Unsafe after revoke",
                                  source_job_ids=[str(a),str(b)])
    finally:
        delete(dsn,[a,b])


def test_host_injects_both_source_ids_and_model_cannot_choose_them(monkeypatch):
    import psycopg
    dsn,token=setup(monkeypatch)
    a=insert(dsn,"document","mcp-team","policy-a.md",
             "Customers may request a refund within 30 days.",[.6,.8],subject="alice")
    b=insert(dsn,"document","mcp-team","policy-b.md",
             "A refund request may be submitted within thirty days.",[.6,.8],subject="alice")
    model=ScriptedQwen()
    try:
        async def scenario():
            async with Client(svc.server) as client:
                return await host.run_agent(
                    "Find the refund policy and propose a short review note.",
                    "note",token,dsn,model=model,mcp_client=client)
        result=run(scenario())
        assert result["status"]=="approval_required",result
        params=model.calls[1]["tools"][0]["function"]["parameters"]
        assert "source_job_ids" not in params["properties"]
        assert "source_job_ids" not in params.get("required",[])
        with psycopg.connect(dsn) as db:
            sources=db.execute(
                "SELECT source_job_ids FROM agent_note_actions WHERE id=%s",
                (result["pending"]["approval_id"],)).fetchone()[0]
        assert set(sources)=={a,b}
        target=result["pending"]["job_id"]
        other=b if str(a)==target else a
        with psycopg.connect(dsn) as db:
            db.execute("DELETE FROM audio_read_grants WHERE job_id=%s",(other,))
            db.commit()
        with pytest.raises(AccessDenied):
            agent_actions.confirm(dsn,"mcp-team","alice",
                                  result["pending"]["approval_token"],"approve")
        assert agent_actions.list_notes(dsn,"mcp-team","alice",target)==[]
    finally:
        delete(dsn,[a,b])


def test_saved_note_read_rechecks_every_original_source_after_revoke(monkeypatch):
    """Codex P1: a saved note derived from A+B must disappear if B is revoked."""
    import psycopg
    from fastapi.testclient import TestClient
    from audio_access import grant_read
    from search_api import app

    dsn,token=setup(monkeypatch)
    a=insert(dsn,"document","mcp-team","policy-a.md",
             "Customers may request a refund within 30 days.",[.6,.8],subject="alice")
    b=insert(dsn,"document","mcp-team","policy-b.md",
             "A refund request may be submitted within thirty days.",[.6,.8],subject="alice")
    headers={"Authorization":"Bearer "+token}
    client=TestClient(app)
    try:
        proposal=agent_actions.propose(
            dsn,"mcp-team","alice",str(a),
            "Combined note: refund can be submitted within thirty days.",
            source_job_ids=[str(a),str(b)])
        saved=agent_actions.confirm(dsn,"mcp-team","alice",
                                    proposal["approval_token"],"approve")
        assert saved["status"]=="written"
        before=client.get(f"/agent/notes/{a}",headers=headers)
        assert before.status_code==200
        assert len(before.json()["notes"])==1

        with psycopg.connect(dsn) as db:
            db.execute("DELETE FROM audio_read_grants WHERE job_id=%s",(b,))
            db.commit()
        revoked=client.get(f"/agent/notes/{a}",headers=headers)
        assert revoked.status_code==200
        assert revoked.json()=={"notes":[]}
        assert agent_actions.list_notes(dsn,"mcp-team","alice",str(a))==[]

        # Restored explicit grant can make it visible again.
        grant_read(dsn,b,"mcp-team","alice")
        restored=client.get(f"/agent/notes/{a}",headers=headers)
        assert len(restored.json()["notes"])==1
        with psycopg.connect(dsn) as db:
            db.execute("DELETE FROM audio_read_grants WHERE job_id=%s",(a,))
            db.commit()
        assert client.get(f"/agent/notes/{a}",headers=headers).json()=={"notes":[]}
    finally:
        delete(dsn,[a,b])
