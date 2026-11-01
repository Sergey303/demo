"""Exact semantic retrieval over timestamped transcripts; model is injected.

No external services, file writes or model downloads happen at import time.
"""
from dataclasses import dataclass
import heapq
import math
from typing import Protocol


class Encoder(Protocol):
    def encode(self, texts: list[str]): ...


@dataclass(frozen=True)
class Hit:
    source: str
    start: float
    end: float
    text: str
    score: float


def unit(vector, dimension=None):
    v = [float(x) for x in vector]
    if not v or (dimension is not None and len(v) != dimension) or not all(map(math.isfinite, v)):
        raise ValueError('Invalid embedding dimensions or values')
    magnitude = math.sqrt(sum(x*x for x in v))
    return [x/magnitude for x in v] if magnitude else [0.0 for _ in v]


class TranscriptIndex:
    """Immutable exact index with bounded batches, O(Nd + N log k) query."""
    def __init__(self, records: list[dict], encoder: Encoder, batch_size=32):
        if batch_size < 1:
            raise ValueError('batch_size must be positive')
        from core import Segment, validate_segments
        per_source = {}
        for record in records:
            if not record['text'].strip():
                raise ValueError('Empty transcript record')
            if not record['source']:
                raise ValueError('Missing source')
            per_source.setdefault(record['source'], []).append(
                Segment(record['start'], record['end'], record['text']))
        for segments in per_source.values():
            validate_segments(segments)
        self.records = tuple(dict(r) for r in records)
        self.encoder = encoder
        self.vectors = []
        self.dimension = None
        for start in range(0, len(records), batch_size):
            current = records[start:start+batch_size]
            encoded = list(encoder.encode([x['text'] for x in current]))
            if len(encoded) != len(current):
                raise ValueError('Unexpected number of embeddings')
            for vector in encoded:
                normalized = unit(vector, self.dimension)
                self.dimension = len(normalized)
                self.vectors.append(normalized)

    def search(self, question: str, k=3, source=None) -> list[Hit]:
        if not question.strip() or k < 1:
            raise ValueError('Require nonempty question and positive k')
        if not self.records:
            return []
        encoded = list(self.encoder.encode([question]))
        if len(encoded) != 1:
            raise ValueError('Expected one query embedding')
        q = unit(encoded[0], self.dimension)
        scored = ((sum(a*b for a,b in zip(q,v)), -i, i) for i,v in enumerate(self.vectors)
                  if source is None or self.records[i]['source'] == source)
        best = heapq.nlargest(k, scored)
        return [Hit(self.records[i]['source'], self.records[i]['start'],
                    self.records[i]['end'], self.records[i]['text'], round(score, 6))
                for score, _, i in best]
