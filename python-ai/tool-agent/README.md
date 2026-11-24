# Safe tool-calling agent foundation

A deterministic **execution boundary for future LLM planning**. This example deliberately does not claim to be a fully autonomous LLM agent: the caller supplies a structured tool call. Demonstrates allowlists, strict argument validation, read-only tools, controlled write operations, user approval, path traversal prevention, and FastAPI integration.

Run: `pip install -r requirements.txt && uvicorn app.main:app --port 8002`; test: `pytest -q`.

Example:

```bash
curl -s localhost:8002/execute -H 'content-type: application/json' \
  -d '{"tool":"draft_note","arguments":{"text":"A draft"}}'
```

The HTTP endpoint deliberately **does not accept an `approved` flag**; it can list/read documents or return `approval_required` for writes, but never perform a write, even when the HTTP caller asks for one. The `Agent.execute(..., approved=True)` method is an **in-process trusted test hook** only, not a remote authorization scheme. Production writes would require authentication, a server-side pending action ID, immutable payload digest and expiring one-use approval token. Add LLM structured-output planner, prompt-injection tests, trace-based evaluation and audited credentials before claiming an autonomous production agent.

**Read boundary (Linux/POSIX):** document reads open relative to a directory descriptor, reject symlinks, multiply linked and non-regular files, and read at most 4000 decoded characters via bounded buffering. The configured directory and its parent path remain operator-trusted; this is not a sandbox for arbitrary hostile filesystem mounts. The in-process draft write and directory listing are separate paths. Offline regression: `python3 -B -m unittest discover -s tests -p test_bounded_read.py -v`.
