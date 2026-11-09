"""EP-05: deterministic source-bound answer, not LLM-generated synthesis.

The only supported answer text is an exact, full UTF-8 excerpt already selected
from current PostgreSQL-authorized retrieval results. Cosine score is NOT a
semantic entailment or factuality guarantee. Never execute instructions from
source text or permit client-supplied citations.
"""
from __future__ import annotations

import math
import re

MIN_SCORE = 0.67   # Explicit heuristic; not calibrated for real-world relevance.
MAX_CITATIONS = 2
STOP_WORDS = frozenset({
    "what", "when", "where", "who", "how", "can", "could", "would", "should",
    "is", "are", "the", "a", "an", "be", "to", "of", "for", "in", "on",
    "at", "do", "does", "did", "with", "which", "it", "this", "that",
    "please", "tell", "me", "about", "may", "must", "or", "and",
})
MAX_ANSWER_CHARS = 3500
REFUSAL = "Недостаточно разрешённых доказательств для ответа."


def abstain(reason: str) -> dict:
    return {
        "mode": "evidence",
        "answer": REFUSAL,
        "abstained": True,
        "citations": [],
        "reason": reason,
        "semantic_verified": False,
    }


def _terms(text: str) -> set[str]:
    return {word for word in re.findall(r"\w+", text.casefold())
            if len(word) > 2 and word not in STOP_WORDS}


def _document_sentence(text: str, question: str) -> tuple[str, int, int] | None:
    """Select a COMPLETE original sentence; never clip a negation or paraphrase.

    Token overlap is only a conservative heuristic for which quote to show,
    NOT semantic validation. If no sentence shares a substantive question word,
    refuse rather than display an unrelated full document chunk.
    """
    wanted = _terms(question)
    if not wanted:
        return None
    candidates: list[tuple[int, int, int, str]] = []
    for match in re.finditer(r"[^.!?\n]+(?:[.!?](?=\s|$))?", text):
        raw = match.group(0)
        excerpt = raw.strip()
        if not excerpt:
            continue
        left = len(raw) - len(raw.lstrip())
        start = match.start() + left
        end = start + len(excerpt)
        overlap = len(_terms(excerpt) & wanted)
        if overlap:
            # Prefer the most relevant full sentence, then original order.
            candidates.append((overlap, -start, end, excerpt))
    if not candidates:
        return None
    _, negative_start, end, excerpt = max(candidates)
    start = -negative_start
    return excerpt, start, end


def cite(hit: dict, question: str | None = None) -> dict | None:
    """Build a precise citation without accepting free-form generated claims."""
    try:
        if not isinstance(hit, dict):
            return None
        job_id, kind, source, excerpt = (
            hit["job_id"], hit["kind"], hit["source"], hit["text"]
        )
        score = hit["score"]
        if (not isinstance(job_id, str) or not isinstance(source, str) or
                not isinstance(excerpt, str) or not excerpt.strip() or
                len(excerpt) > 1500 or not isinstance(score, (float, int)) or
                isinstance(score, bool) or not math.isfinite(score) or
                score < MIN_SCORE or not -1 <= score <= 1):
            return None
        # Verify the identifier/metadata types; the retriever produces these
        # fields only after DB grant filtering and strict evidence validation.
        from uuid import UUID
        excerpt.encode("utf-8", errors="strict")
        source.encode("utf-8", errors="strict")
        if str(UUID(job_id)) != job_id.lower():
            return None
        if not (1 <= len(source) <= 100) or kind not in ("audio", "document"):
            return None
        citation = {"job_id": job_id, "kind": kind, "source": source,
                    "quote": excerpt, "score": score}
        if kind == "audio":
            start, end = hit["start"], hit["end"]
            if (type(start) not in (float, int) or type(end) not in (float, int) or
                    not math.isfinite(start) or not math.isfinite(end) or
                    start < 0 or end < start):
                return None
            citation.update({"start": start, "end": end})
        else:
            start, end = hit["char_start"], hit["char_end"]
            if (type(start) is not int or type(end) is not int or
                    start < 0 or end <= start):
                return None
            if question is not None:
                selection = _document_sentence(excerpt, question)
                if selection is None:
                    return None
                precise_quote, relative_start, relative_end = selection
                citation["quote"] = precise_quote
                start = start + relative_start
                end = hit["char_start"] + relative_end
            citation.update({"char_start": start, "char_end": end})
        return citation
    except (ValueError, KeyError, TypeError, OverflowError, UnicodeError):
        return None


def evidence_answer(retrieval: dict, question: str | None = None) -> dict:
    """Compose at most two exact quotations from an already authorized result.

    A client cannot provide its own hits to /answer; the API always calls
    retrieve_authorized again with the validated bearer identity.
    """
    if not isinstance(retrieval, dict):
        return abstain("invalid_retrieval")
    if retrieval.get("abstained") is True:
        return abstain(str(retrieval.get("reason") or "no_authorized_evidence"))
    raw = retrieval.get("hits")
    if not isinstance(raw, list) or len(raw) > 5:
        return abstain("invalid_retrieval")
    selected: list[dict] = []
    seen = set()
    for hit in raw:
        citation = cite(hit, question=question)
        if citation is None:
            continue
        # Do not repeat the same fragment, but two different source types are
        # useful to demonstrate exact provenance in the hiring demo.
        identity = (citation["job_id"], citation.get("start", citation.get("char_start")),
                    citation.get("end", citation.get("char_end")))
        if identity in seen:
            continue
        if sum(len(c["quote"]) for c in selected) + len(citation["quote"]) > MAX_ANSWER_CHARS:
            break
        selected.append(citation)
        seen.add(identity)
        if len(selected) >= MAX_CITATIONS:
            break
    if not selected:
        return abstain("below_relevance_threshold_or_invalid_citations")
    answer = "\n".join(c["quote"] for c in selected)
    # This is an exact concatenation, never a generated or paraphrased claim.
    return {
        "mode": "evidence",
        "answer": answer,
        "abstained": False,
        "citations": selected,
        "reason": "verbatim_authorized_source_excerpts",
        "semantic_verified": False,
    }
