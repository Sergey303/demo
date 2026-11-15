"""Deterministic AI Gateway policy for the local enterprise evidence demo.

This layer is *not* an IAM/PDP, prompt-injection detector with guaranteed
recall, or a factuality verifier. SQL grants and signed principals are always
authoritative. Policy decisions are safe reason codes, never excerpts.
"""
from __future__ import annotations

import re

POLICY_VERSION = "demo-gateway-v1"
MAX_QUESTION = 500
MAX_NOTE = 500
MAX_ANSWER = 1_000

# Narrow, high-confidence credential signatures. Intentionally do not reject
# ordinary e-mail addresses, names, invoices, or mentions of "password".
_SECRET = (
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", re.IGNORECASE),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b"),
    re.compile(r"\bBearer\s+[A-Za-z0-9_.-]{32,}\b", re.IGNORECASE),
)
# Defense in depth only: not an exhaustive prompt injection classifier.
_OVERRIDE = (
    re.compile(r"\bignore\s+(?:all\s+)?(?:previous|prior|above|system|developer)\s+instructions\b", re.IGNORECASE),
    re.compile(r"\b(?:reveal|print|disclose)\s+(?:your\s+)?(?:hidden\s+)?(?:system|developer)\s+prompt\b", re.IGNORECASE),
    re.compile(r"\b(?:обойди|игнорируй)\s+(?:все\s+)?(?:предыдущие|системные)\s+инструкции\b", re.IGNORECASE),
)
_EXTERNAL_LINK = re.compile(r"(?i)(?:https?://|mailto:|ftp://|data:|javascript:)")
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_ALLOWED_TOOLS = frozenset({"search_evidence", "propose_review_note"})
_IDENTITY_FIELDS = frozenset({
    "tenant", "tenant_id", "subject", "subject_id", "user_id",
    "principal", "authorization", "token", "dsn", "url", "endpoint",
})


class GateBlocked(ValueError):
    """Rejected by a stable policy rule, without reproducing sensitive data."""

    def __init__(self, stage: str, reason: str):
        self.stage = stage
        self.reason = reason
        super().__init__(f"{stage}:{reason}")


def _text(value: object, *, stage: str, max_length: int,
          instructions: bool = False, links: bool = False) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > max_length:
        raise GateBlocked(stage, "invalid_length")
    try:
        value.encode("utf-8", "strict")
    except UnicodeError:
        raise GateBlocked(stage, "invalid_unicode") from None
    if _CONTROL.search(value):
        raise GateBlocked(stage, "control_character")
    if any(pattern.search(value) for pattern in _SECRET):
        raise GateBlocked(stage, "credential_pattern")
    if instructions and any(pattern.search(value) for pattern in _OVERRIDE):
        raise GateBlocked(stage, "injection_signal")
    if links and _EXTERNAL_LINK.search(value):
        raise GateBlocked(stage, "external_link")
    return value


def request(question: str) -> None:
    """Ingress: bounded valid UTF-8, no likely credential dump or overrides."""
    _text(question, stage="request", max_length=MAX_QUESTION, instructions=True)


def tool_call(name: str, args: dict, expected: str) -> None:
    """Tool policy in addition to JSON schema validation in the orchestrator."""
    if name not in _ALLOWED_TOOLS or name != expected or not isinstance(args, dict):
        raise GateBlocked("tool", "unapproved_tool")
    if set(args) & _IDENTITY_FIELDS:
        raise GateBlocked("tool", "identity_override")
    if name == "search_evidence":
        if set(args) - {"question", "top_k"}:
            raise GateBlocked("tool", "unexpected_parameter")
        request(args.get("question"))
    elif name == "propose_review_note":
        if set(args) != {"job_id", "note"}:
            raise GateBlocked("tool", "unexpected_parameter")
        note(args.get("note"))


def note(value: str) -> None:
    """A proposed write must not contain credentials or an outbound link."""
    _text(value, stage="tool", max_length=MAX_NOTE, links=True)


def source(quote: str) -> None:
    """Do not feed likely tool-injection instructions or credentials to a model.

    This is intentionally conservative: a false positive abstains instead of
    changing SQL authorization, silently redacting source offsets, or making a
    fabricated citation. Raw evidence-only access is a separate operation.
    """
    _text(quote, stage="source", max_length=1_500, instructions=True)


def outgoing(text: str) -> None:
    """Egress DLP for generated answer/note; no URL or apparent credential."""
    _text(text, stage="response", max_length=MAX_ANSWER, links=True)


def citation_egress(items: list[dict]) -> None:
    """Ensure raw citations cannot become an unscanned credential echo."""
    if not isinstance(items, list) or len(items) > 5:
        raise GateBlocked("response", "invalid_citation_set")
    for c in items:
        if not isinstance(c, dict):
            raise GateBlocked("response", "invalid_citation")
        raw = c.get("quote", c.get("text"))
        _text(raw, stage="response", max_length=1_500)
        if "source" in c:
            _text(c["source"], stage="response", max_length=100)


def public_policy() -> dict:
    """Safe metadata for the browser; never include request/source/model text."""
    return {"version": POLICY_VERSION, "identity": "server_bound",
            "tools": "allowlisted", "output": "validated"}


def verified_tool_citation(value: object, *, expected_id: str) -> dict:
    """Reject malformed/extra MCP fields before they enter the model context.

    This only validates provenance SHAPE. The current PostgreSQL authorization
    and source bytes still come from the trusted MCP tool and SQL queries.
    """
    import math
    from uuid import UUID

    if not isinstance(value, dict) or value.get("id") != expected_id:
        raise GateBlocked("source", "invalid_citation")
    kind = value.get("kind")
    common = {"id", "job_id", "source", "kind", "quote"}
    coords = ({"start", "end"} if kind == "audio" else
              {"char_start", "char_end"} if kind == "document" else None)
    if coords is None or set(value) != common | coords:
        raise GateBlocked("source", "invalid_citation")
    job = value.get("job_id")
    try:
        if not isinstance(job, str) or str(UUID(job)) != job.lower():
            raise ValueError()
    except (ValueError, TypeError, AttributeError):
        raise GateBlocked("source", "invalid_citation") from None
    source_name = value.get("source")
    if not isinstance(source_name, str) or not 1 <= len(source_name) <= 100:
        raise GateBlocked("source", "invalid_citation")
    _text(value.get("quote"), stage="source", max_length=1_500, instructions=True)
    _text(source_name, stage="source", max_length=100, instructions=True)
    if kind == "audio":
        start, end = value["start"], value["end"]
        if (type(start) not in (int, float) or type(end) not in (int, float) or
                not math.isfinite(start) or not math.isfinite(end) or
                start < 0 or end < start):
            raise GateBlocked("source", "invalid_citation")
    else:
        start, end = value["char_start"], value["char_end"]
        if (type(start) is not int or type(end) is not int or start < 0 or end <= start):
            raise GateBlocked("source", "invalid_citation")
    ordered = ("id", "job_id", "source", "kind", "quote",
               "start", "end", "char_start", "char_end")
    return {key: value[key] for key in ordered if key in value}
