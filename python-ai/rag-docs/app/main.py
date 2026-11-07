"""Run: uvicorn app.main:app --reload. Requires a downloaded embedding model."""
import os
from pathlib import Path
from functools import lru_cache
from typing import Literal
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field, ConfigDict
from .core import KnowledgeBase, build_prompt, chunk_documents
from .access import verify_token, AccessDenied, authorized_sources, PolicyUnavailable
from .evidence import decide_evidence, DEFAULT_MIN_SCORE
from .guarded import guarded_answer, abstain

app = FastAPI(title="Neural RAG document assistant", version="1.0.0")

class AskRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    question: str = Field(min_length=1, max_length=2000)
    top_k: int = Field(default=3, ge=1, le=8)
    generate: bool = False
    answer_mode: Literal['retrieval', 'evidence', 'guarded'] = 'retrieval'

@lru_cache
def knowledge_base() -> KnowledgeBase:
    from sentence_transformers import SentenceTransformer
    model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    encoder = SentenceTransformer(model_name)
    return KnowledgeBase(chunk_documents(Path(os.getenv("DOCS_DIR", "documents"))), encoder)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/ask")
def ask(req: AskRequest, authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Unauthorized')
    try:
        tenant, subject = verify_token(authorization[7:])
    except (AccessDenied, RuntimeError):
        raise HTTPException(status_code=401, detail='Unauthorized') from None
    try:
        configured_policy = os.getenv('DOCS_ACL_FILE')
        allowed = authorized_sources(Path(configured_policy) if configured_policy else None,
                                     tenant, subject)
    except PolicyUnavailable:
        raise HTTPException(status_code=503, detail='Authorization policy unavailable') from None
    if req.answer_mode == 'guarded' and not req.generate:
        raise HTTPException(status_code=422, detail='Guarded mode requires generate=true')
    if req.answer_mode == 'evidence' and req.generate:
        raise HTTPException(status_code=422, detail='Evidence-only mode cannot generate free-form LLM text')
    if not allowed:
        if req.answer_mode == 'guarded':
            return abstain('no_authorized_sources')
        if req.answer_mode == 'evidence':
            decision = decide_evidence([])
            return {'answer': decision.answer, 'sources': [], 'mode': 'evidence',
                    'abstained': True, 'citations': [], 'reason': decision.reason}
        return {'answer':'No authorized evidence.', 'sources':[], 'mode':'retrieval'}
    try:
        hits = knowledge_base().search(req.question, req.top_k, allowed_sources=allowed)
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=503, detail='Retrieval unavailable') from exc
    if req.answer_mode == 'guarded':
        return guarded_answer(req.question, hits, allowed)
    if req.answer_mode == 'evidence':
        decision = decide_evidence(hits, min_score=DEFAULT_MIN_SCORE)
        # Sources/citations are withheld on abstention: no misleading evidence.
        return {'answer': decision.answer, 'sources': hits[:1] if not decision.abstained else [],
                'mode': 'evidence', 'abstained': decision.abstained,
                'citations': decision.citations, 'reason': decision.reason}
    response = {"answer": None, "sources": hits, "mode": "retrieval"}
    if not hits:
        response["answer"] = "No documents indexed."
    elif req.generate:
        import httpx
        # Local Ollama only: never sends documents to an external SaaS.
        url = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
        if not url.startswith(("http://127.0.0.1:", "http://localhost:")):
            raise HTTPException(400, "Only local Ollama endpoints supported")
        try:
            r = httpx.post(f"{url}/api/generate", json={
                "model": os.getenv("OLLAMA_MODEL", "llama3.2"),
                "prompt": build_prompt(req.question, hits), "stream": False
            }, timeout=90)
            r.raise_for_status()
            response["answer"] = r.json()["response"]
            response["mode"] = "local-llm"
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            raise HTTPException(status_code=503, detail=f"Local LLM unavailable: {exc}") from exc
    return response
