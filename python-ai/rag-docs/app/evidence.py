"""Conservative source-quote mode: never present model prose as verified facts.

Similarity is a relevance proxy, NOT entailment. A quote can be topical but
fail to answer the question. Evaluate source selection and abstention separately.
"""
from dataclasses import dataclass
import math
import re

NO_EVIDENCE = "Insufficient authorized evidence to answer."
DEFAULT_MIN_SCORE = 0.67


@dataclass(frozen=True)
class EvidenceDecision:
    answer: str
    abstained: bool
    citations: list[str]
    reason: str


def decide_evidence(hits: list[dict], *, min_score: float = DEFAULT_MIN_SCORE) -> EvidenceDecision:
    if not isinstance(min_score, (int, float)) or not math.isfinite(min_score) or not -1 <= min_score <= 1:
        raise ValueError('min_score must be a finite cosine similarity in [-1, 1]')
    if not hits:
        return EvidenceDecision(NO_EVIDENCE, True, [], 'no_authorized_sources')
    top = hits[0]
    score = top['score']
    if not isinstance(score, (int, float)) or not math.isfinite(score) or score < min_score:
        return EvidenceDecision(NO_EVIDENCE, True, [], 'below_relevance_threshold')
    # No rephrasing, interpolation, inferred answers or unsupported citations.
    source, passage = top['source'], top['passage']
    if not isinstance(source, str) or not source or not isinstance(passage, str) or not passage.strip():
        raise ValueError('Malformed retrieved passage')
    return EvidenceDecision(passage.strip(), False, [source], 'verbatim_source_excerpt')
