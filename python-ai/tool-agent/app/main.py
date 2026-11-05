"""Minimal HTTP tool-execution boundary. No autonomous remote side effects."""
from pathlib import Path
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from .agent import Agent, Action

app = FastAPI(title='Human-approved AI Tool Agent')


class Request(BaseModel):
    # A caller-controlled approval flag is not an authorization boundary.
    # This public endpoint is intentionally read-only; writes need a separate,
    # authenticated, server-side approval workflow (not part of this demo).
    model_config = ConfigDict(extra="forbid")
    tool: str
    arguments: dict = Field(default_factory=dict)


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.post('/execute')
def execute(request: Request):
    try:
        return Agent(Path(os.getenv('AGENT_DOCUMENTS', 'documents'))).execute(
            Action(request.tool, request.arguments), approved=False)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
