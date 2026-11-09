"""One-use, principal-bound confirmation for MCP-proposed review notes.

The LLM and MCP tool can only *propose* a write. A human initiates a separate
HTTP confirmation; the same tenant/subject and current job grant are checked
under a PostgreSQL row lock before exactly one note is committed.
"""
from __future__ import annotations

from hashlib import sha256
import re
import secrets
from uuid import UUID, uuid4

import psycopg

from audio_access import AccessDenied

MAX_NOTE = 500
APPROVAL_TTL_SECONDS = 300
TOKEN_RE = re.compile(r"^([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$")


def _uuid(value: str) -> UUID:
    if not isinstance(value, str) or len(value) != 36:
        raise ValueError("Expected a UUID")
    parsed = UUID(value)
    if str(parsed) != value.lower():
        raise ValueError("Expected canonical UUID")
    return parsed


def propose(dsn: str, tenant: str, subject: str, job_id: str, note: str,
            *, source_job_ids: list[str] | None = None) -> dict:
    """Persist a *pending* action bound to every original prompt source.

    The host supplies source_job_ids, never the model. This still performs no
    final note write: confirmation locks ALL grants and checks a one-use token.
    """
    if not isinstance(note, str) or not 1 <= len(note.strip()) <= MAX_NOTE or len(note) > MAX_NOTE:
        raise ValueError("Invalid note length")
    note.encode("utf-8", "strict")
    job = _uuid(job_id)
    raw_ids = [job_id] if source_job_ids is None else source_job_ids
    if not isinstance(raw_ids, list) or not 1 <= len(raw_ids) <= 2:
        raise ValueError("Invalid source set")
    ids = list(dict.fromkeys(_uuid(value) for value in raw_ids))
    if job not in ids:
        raise ValueError("Target is not among the prompt sources")

    aid = uuid4()
    nonce = secrets.token_urlsafe(32)
    digest = sha256(nonce.encode("ascii")).hexdigest()
    with psycopg.connect(dsn, connect_timeout=3) as db:
        with db.cursor() as cur:
            cur.execute("""
                SELECT j.id FROM jobs j
                JOIN audio_read_grants g ON g.job_id=j.id
                  AND g.tenant_id=j.tenant_id AND g.subject_id=%s
                WHERE j.id=ANY(%s::uuid[]) AND j.tenant_id=%s
                  AND j.status='done' AND j.kind IN ('document','audio')
                FOR SHARE OF j,g
            """, (subject,ids,tenant))
            if {row[0] for row in cur.fetchall()} != set(ids):
                raise AccessDenied("Access denied")
            cur.execute("""
                INSERT INTO agent_note_actions
                  (id,tenant_id,subject_id,job_id,source_job_ids,
                   proposed_text,nonce_sha256,expires_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,now()+interval '5 minutes')
            """, (aid,tenant,subject,job,ids,note,digest))
        db.commit()
    return {"approval_id":str(aid), "approval_token":f"{aid}.{nonce}",
            "job_id":str(job), "proposed_text":note, "expires_in_seconds":APPROVAL_TTL_SECONDS}


def confirm(dsn: str, tenant: str, subject: str,
            approval_token: str, decision: str) -> dict:
    if decision not in ("approve", "reject"):
        raise ValueError("Invalid decision")
    match = TOKEN_RE.fullmatch(approval_token) if isinstance(approval_token,str) else None
    if match is None:
        raise AccessDenied("Access denied")
    aid = _uuid(match.group(1))
    digest = sha256(match.group(2).encode("ascii")).hexdigest()

    with psycopg.connect(dsn, connect_timeout=3) as db:
        with db.cursor() as cur:
            cur.execute("""
                SELECT job_id,proposed_text,source_job_ids
                FROM agent_note_actions
                WHERE id=%s AND nonce_sha256=%s AND tenant_id=%s AND subject_id=%s
                  AND consumed_at IS NULL AND expires_at>now()
                FOR UPDATE
            """, (aid,digest,tenant,subject))
            row = cur.fetchone()
            if row is None:
                raise AccessDenied("Access denied")
            job_id, note_text, source_ids = row
            # Deny both approve and reject after ANY prompt-source grant revokes.
            # Lock the *grant row*, not merely an EXISTS result. A concurrent
            # DELETE grant must serialize before or after this transaction;
            # no note may commit after a revoke already committed.
            cur.execute("""
                SELECT g.job_id
                FROM jobs j
                JOIN audio_read_grants g ON g.job_id=j.id
                  AND g.tenant_id=j.tenant_id AND g.subject_id=%s
                WHERE j.id=ANY(%s::uuid[]) AND j.tenant_id=%s
                  AND j.status='done' AND j.kind IN ('document','audio')
                FOR SHARE OF j, g
            """, (subject,source_ids,tenant))
            if {r[0] for r in cur.fetchall()} != set(source_ids):
                raise AccessDenied("Access denied")
            note_id = None
            if decision == "approve":
                note_id = uuid4()
                cur.execute("""
                    INSERT INTO agent_review_notes
                      (id,approval_id,tenant_id,subject_id,job_id,note_text)
                    VALUES (%s,%s,%s,%s,%s,%s)
                """, (note_id,aid,tenant,subject,job_id,note_text))
            cur.execute("""
                UPDATE agent_note_actions SET consumed_at=now(), decision=%s
                WHERE id=%s AND consumed_at IS NULL
            """, ("approved" if decision=="approve" else "rejected",aid))
            if cur.rowcount != 1:
                raise AccessDenied("Access denied")
        db.commit()
    return {"status":"written" if note_id else "rejected",
            "note_id":str(note_id) if note_id else None, "job_id":str(job_id)}


def list_notes(dsn: str, tenant: str, subject: str, job_id: str) -> list[dict]:
    job = _uuid(job_id)
    with psycopg.connect(dsn, connect_timeout=3) as db:
        rows = db.execute("""
            SELECT n.id::text, n.note_text
            FROM agent_review_notes n
            JOIN agent_note_actions a ON a.id=n.approval_id
              AND a.job_id=n.job_id AND a.tenant_id=n.tenant_id
              AND a.subject_id=n.subject_id
            JOIN jobs j ON j.id=n.job_id AND j.tenant_id=n.tenant_id
            WHERE n.job_id=%s AND n.tenant_id=%s AND n.subject_id=%s
              AND j.status='done' AND j.kind IN ('document','audio')
              -- A saved note may paraphrase BOTH prompt sources. If ANY
              -- source loses its grant, hide the entire note on every read.
              AND NOT EXISTS (
                SELECT 1 FROM unnest(a.source_job_ids) AS src(job_id)
                WHERE NOT EXISTS (
                  SELECT 1 FROM jobs sj
                  JOIN audio_read_grants g ON g.job_id=sj.id
                    AND g.tenant_id=sj.tenant_id AND g.subject_id=n.subject_id
                  WHERE sj.id=src.job_id AND sj.tenant_id=n.tenant_id
                    AND sj.status='done' AND sj.kind IN ('document','audio')
                )
              )
            ORDER BY n.created_at DESC,n.id LIMIT 5
        """,(job,tenant,subject)).fetchall()
    return [{"id":i,"note":note} for i,note in rows]
