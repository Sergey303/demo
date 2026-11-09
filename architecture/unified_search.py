"""EP-04: exact authorized retrieval over audio and document JSONB evidence.

NO independent vector store, index cache, or permissive source manifest.
PostgreSQL filters tenant + live owner grants BEFORE Python reads any vectors.
Local BGE-small-en-v1.5 is shared with both audio and document ingestion.
"""
from __future__ import annotations

from heapq import nlargest
from threading import Lock
import math
from pathlib import Path
import sys

MODEL = "BAAI/bge-small-en-v1.5"
MAX_JOBS = 100
MAX_SEGMENTS = 500
MAX_QUESTION = 500
MAX_TOP_K = 5
AUDIO = Path(__file__).resolve().parents[1] / "python-ai" / "audio-search"
_model = None
_model_lock = Lock()
_inference_lock = Lock()


def local_encoder():
    """One lazy cached CPU model, initialized only after an authorized SQL hit."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                sys.path.insert(0, str(AUDIO))
                from pipeline import OnnxEncoder
                _model = OnnxEncoder(model_name=MODEL)
    return _model


def unit(raw: object) -> list[float]:
    if not isinstance(raw, (list, tuple)) and not hasattr(raw, "__iter__"):
        raise ValueError("Expected numeric embedding")
    vector = [float(v) for v in raw]
    if not vector or len(vector) > 2048 or any(not math.isfinite(v) for v in vector):
        raise ValueError("Invalid embedding")
    norm = math.sqrt(sum(x * x for x in vector))
    if not math.isfinite(norm) or norm <= 0:
        raise ValueError("Invalid embedding norm")
    return [x / norm for x in vector]


def evidence(record_id, kind: str, row: dict, dim: int) -> dict | None:
    if not isinstance(row, dict):
        return None
    vector = row.get("embedding")
    if not isinstance(vector, list) or len(vector) != dim:
        return None
    try:
        value = unit(vector)
    except (ValueError, TypeError, OverflowError):
        return None
    text, source = row.get("text"), row.get("source")
    if not isinstance(text, str) or not text.strip() or len(text) > 1500:
        return None
    if not isinstance(source, str) or not source or len(source) > 100:
        return None
    common = {"job_id": str(record_id), "kind": kind, "source": source, "text": text}
    if kind == "audio":
        start, end = row.get("start"), row.get("end")
        if not isinstance(start, (int,float)) or not isinstance(end,(int,float)) or \
            not math.isfinite(start) or not math.isfinite(end) or start < 0 or end < start:
            return None
        common.update({"start": start, "end": end})
    elif kind == "document":
        start, end, idx = row.get("char_start"), row.get("char_end"), row.get("chunk_index")
        if any(isinstance(v, bool) or not isinstance(v, int) for v in (start,end,idx)) or \
            start < 0 or end <= start or idx < 0:
            return None
        common.update({"char_start": start, "char_end": end, "chunk_index": idx})
    else:
        return None
    return {"metadata": common, "vector": value}


def retrieve_authorized(dsn: str, tenant: str, subject: str, question: str,
                        top_k: int = 3, *, encoder=None) -> dict:
    """Exact cosine over authorized current tenant/grants; no cache across revokes.

    Trusted caller already validated a signed tenant+subject identity.
    An ungranted record is NEVER read or embedded into Python and cannot
    affect top-k results. Query embedding is initialized only after SQL
    returns at least one authorized eligible record.
    """
    if not isinstance(question, str) or not question.strip() or len(question) > MAX_QUESTION:
        raise ValueError("Expected a 1–500 character question")
    if isinstance(top_k, bool) or not isinstance(top_k, int) or not 1 <= top_k <= MAX_TOP_K:
        raise ValueError("top_k must be 1–5")

    import psycopg
    with psycopg.connect(dsn, connect_timeout=3) as db:
        # Query entirely inside the DB grant predicate; never load other tenants.
        with db.cursor() as cur:
            cur.execute("""WITH allowed AS MATERIALIZED (
                   SELECT j.id,j.kind,j.result,j.created_at FROM jobs j
                   WHERE j.tenant_id=%s AND j.status='done'
                     AND j.kind IN ('audio','document')
                     AND EXISTS(SELECT 1 FROM audio_read_grants g
                       WHERE g.job_id=j.id AND g.tenant_id=j.tenant_id
                         AND g.subject_id=%s)
                   ORDER BY j.created_at DESC, j.id LIMIT %s
                 )
                 SELECT a.id,a.kind,a.result->>'model',segment.value
                 FROM allowed a
                 CROSS JOIN LATERAL jsonb_array_elements(
                   CASE WHEN jsonb_typeof(a.result->'segments')='array'
                     THEN a.result->'segments' ELSE '[]'::jsonb END
                 ) AS segment(value)
                 ORDER BY a.created_at DESC,a.id
                 LIMIT %s""", (tenant, subject, MAX_JOBS, MAX_SEGMENTS))
            permitted = cur.fetchall()

    if not permitted:
        return {"hits": [], "abstained": True, "reason": "no_authorized_evidence"}

    # Filter incompatible encoder provenance before initializing ONNX. This
    # ensures an incompatible-only authorized corpus safely abstains even if
    # local model weights are unavailable or would trigger a large download.
    compatible = [
        (record_id, kind, item)
        for record_id, kind, model, item in permitted
        if (kind == "document" and model == MODEL)
        or (kind == "audio" and model in (None, MODEL))
    ]
    if not compatible:
        return {"hits": [], "abstained": True, "reason": "no_compatible_evidence"}

    if encoder is None:
        encoder = local_encoder()
    # Bound CPU inference concurrency; avoid multiple huge model sessions.
    with _inference_lock:
        encoded = list(encoder.encode([question]))
    if len(encoded) != 1:
        raise ValueError("Invalid query embedding count")
    query = unit(encoded[0])
    scored = []
    for record_id, kind, item in compatible:
        row = evidence(record_id, kind, item, len(query))
        if row is None:
            continue
        score = sum(a * b for a, b in zip(query, row["vector"]))
        if math.isfinite(score):
            scored.append((score, -len(scored), row["metadata"]))
    hits = []
    for score, _, metadata in nlargest(top_k, scored):
        hits.append({**metadata, "score": round(score, 6)})
    return {"hits": hits, "abstained": not hits,
            "reason": None if hits else "no_compatible_evidence"}
