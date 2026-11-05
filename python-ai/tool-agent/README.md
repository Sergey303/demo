# Safe tool-calling agent foundation

A deterministic **execution boundary for future LLM planning**. This example deliberately does not claim to be a fully autonomous LLM agent: the caller supplies a structured tool call. Demonstrates allowlists, strict argument validation, read-only tools, controlled write operations, user approval, path traversal prevention, and FastAPI integration.

Run: `pip install -r requirements.txt && uvicorn app.main:app --port 8002`; test: `pytest -q`.

Example:

```bash
curl -s localhost:8002/execute -H 'content-type: application/json' \
  -d '{"tool":"draft_note","arguments":{"text":"A draft"}}'
```

The HTTP endpoint deliberately **does not accept an `approved` flag**; it can list/read documents or return `approval_required` for writes, but never perform a write, even when the HTTP caller asks for one. The `Agent.execute(..., approved=True)` method is an **in-process trusted test hook** only, not a remote authorization scheme. Production writes would require authentication, a server-side pending action ID, immutable payload digest and expiring one-use approval token. Add LLM structured-output planner, prompt-injection tests, trace-based evaluation and audited credentials before claiming an autonomous production agent.
