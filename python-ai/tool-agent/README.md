# Safe tool-calling agent foundation

A deterministic **execution boundary for future LLM planning**. This example deliberately does not claim to be a fully autonomous LLM agent: the caller supplies a structured tool call. Demonstrates allowlists, strict argument validation, read-only tools, controlled write operations, user approval, path traversal prevention, and FastAPI integration.

Run: `pip install -r requirements.txt && uvicorn app.main:app --port 8002`; test: `pytest -q`.

Example:

```bash
curl -s localhost:8002/execute -H 'content-type: application/json' \
  -d '{"tool":"draft_note","arguments":{"text":"A draft"}}'
```

Without `approved: true`, the response requests approval and does not write. **Security note:** the demo `approved` flag is client-controlled and is NOT trustworthy authorization. Production must bind approval to an authenticated user, server-side pending action ID, immutable payload hash and expiring one-use approval token. Add LLM structured-output planner, prompt-injection tests, trace-based evaluation and audited credentials before claiming an autonomous production agent.
