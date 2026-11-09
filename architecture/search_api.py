"""Local-only signed search with exact citations and optional Qwen generation.

Not production IAM. Ollama requests are loopback-only and always use the
same PostgreSQL tenant/subject ACL as the extractive endpoint.
"""
from __future__ import annotations

import logging
import os
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from audio_access import AccessDenied, verify_token
from unified_search import retrieve_authorized
from evidence_answer import evidence_answer
from guarded_generation import generated_answer, ModelUnavailable

app = FastAPI(
    title="Portfolio authorized evidence search",
    docs_url=None, redoc_url=None, openapi_url=None,
)


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(min_length=1, max_length=500)
    top_k: int = Field(default=3, ge=1, le=5)


class AnswerRequest(SearchRequest):
    mode: Literal["evidence", "generated"] = "evidence"


@app.middleware("http")
async def never_cache_evidence(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/health")
def health():
    return {"status": "running"}  # Liveness, never claims model readiness.


@app.get("/ready")
def ready():
    dsn = os.environ.get("JOBS_TEST_CONNECTION")
    if not dsn:
        return JSONResponse(status_code=503, content={"error": "Search DB unavailable"})
    try:
        import psycopg
        with psycopg.connect(dsn, connect_timeout=2) as db:
            value = db.execute("SELECT 1").fetchone()
            if value == (1,):
                return {"status": "db_ready"}  # NOT an inference-model readiness check.
    except (Exception,):
        pass
    return JSONResponse(status_code=503, content={"error": "Search DB unavailable"})


def _authorized_retrieval(body: SearchRequest, authorization: str | None):
    """Fail closed on identity before reading any source evidence."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        tenant, subject = verify_token(authorization.removeprefix("Bearer "))
    except AccessDenied:
        raise HTTPException(status_code=401, detail="Unauthorized") from None
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Search unavailable") from None

    dsn = os.environ.get("JOBS_TEST_CONNECTION", "")
    if not dsn:
        raise HTTPException(status_code=503, detail="Search unavailable")
    try:
        return retrieve_authorized(dsn, tenant, subject, body.question, body.top_k)
    except Exception as exc:
        # Never log user question, source text, DB credentials or model vectors.
        logging.warning("Authorized retrieval failed: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Search unavailable") from None


@app.post("/search")
def search(body: SearchRequest, authorization: str | None = Header(default=None)):
    return _authorized_retrieval(body, authorization)


@app.post("/answer")
def answer(body: AnswerRequest, authorization: str | None = Header(default=None)):
    """Default evidence-only; optional generated answer shares the same ACL.

    Citations validate provenance, NOT semantic entailment or factual truth.
    """
    retrieval = _authorized_retrieval(body, authorization)
    if body.mode == "evidence":
        return evidence_answer(retrieval, question=body.question)

    try:
        tenant, subject = verify_token(authorization.removeprefix("Bearer "))
    except AccessDenied:
        raise HTTPException(status_code=401, detail="Unauthorized") from None
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Search unavailable") from None

    dsn = os.environ.get("JOBS_TEST_CONNECTION", "")
    try:
        response = generated_answer(retrieval, body.question, dsn, tenant, subject)
        # A short-lived signed token may expire during CPU inference.
        verify_token(authorization.removeprefix("Bearer "))
        return response
    except AccessDenied:
        raise HTTPException(status_code=401, detail="Unauthorized") from None
    except ModelUnavailable:
        raise HTTPException(status_code=503, detail="Local LLM unavailable") from None
    except Exception as exc:
        logging.warning("Optional generation failed: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Generation unavailable") from None


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5088, workers=1, log_level="warning")
