"""Sentence-sized retrieval passages from ASR segments.

Sentence boundaries are textual; timestamps within a Whisper segment are
estimated proportionally and MUST NOT be described as word-aligned.
"""
import re
from core import Segment, validate_segments


def split_records(records):
    result = []
    for record in records:
        start, end = float(record['start']), float(record['end'])
        validate_segments([Segment(start, end, record['text'])])
        raw = record['text'].strip()
        sentences = [m for m in re.finditer(r'[^.!?]+(?:[.!?]+|$)', raw) if m.group().strip()]
        if not sentences:
            continue
        # Character share is an approximation, not acoustic alignment.
        duration = end - start
        for match in sentences:
            item = dict(record)
            item['text'] = match.group().strip()
            item['start'] = start + duration * match.start() / len(raw)
            item['end'] = start + duration * match.end() / len(raw)
            result.append(item)
    return result
