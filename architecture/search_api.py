"""Local-only signed-identity semantic search API for EP-04.

Run with the same trusted secret as .NET and the Vite server. Not production
OIDC, not a public endpoint and not a replacement for PostgreSQL authorization.
No cloud LLM or generative "answers" are invoked.
"""
from __future__ import annotations

import logging
import os

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from audio_access import AccessDenied, verify_token
from unified_search import retrieve_authorized
from evidence_answer import evidence_answer

app = FastAPI(
    title="Portfolio authorized evidence search",
    docs_url=None, redoc_url=None, openapi_url=None,
)


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(min_length=1, max_length=500)
    top_k: int = Field(default=3, ge=1, le=5)


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
def answer(body: SearchRequest, authorization: str | None = Header(default=None)):
    """Re-read current PostgreSQL ACL for EVERY answer request.

    Only a deterministic exact quote from this request's authorized hits can
    be returned; the client cannot submit its own citations or source text.
    No LLM is run, and citation provenance is NOT semantic entailment.
    """
    return evidence_answer(_authorized_retrieval(body, authorization), question=body.question)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5088, workers=1, log_level="warning")
