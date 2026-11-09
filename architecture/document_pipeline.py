"""Bounded, deterministic document chunking and local ONNX indexing (no cloud API).

Documents are UTF-8 .txt/.md; source text is already stored in jobs.input.
The result JSON uses the same BGE-small encoder as audio, enabling later
unified authorized retrieval without embedding-space mismatches.
"""
from hashlib import sha256

MAX_DOCUMENT_BYTES = 24_576
CHUNK_CHARS = 700
MAX_CHUNKS = 64


def chunk_text(text: str, *, size: int = CHUNK_CHARS) -> list[dict]:
    if not 1 <= size <= 4096:
        raise ValueError("Invalid chunk size")
    result = []
    position = 0
    while position < len(text):
        start = position
        end = min(position + size, len(text))
        if end < len(text):
            # Break on a line or word when reasonable, never discard characters.
            breaks = [text.rfind("\n", start + size // 2, end),
                      text.rfind(" ", start + size // 2, end)]
            split = max(breaks)
            if split > start:
                end = split + 1
        position = end
        piece = text[start:end]
        leading = len(piece) - len(piece.lstrip())
        trailing = len(piece.rstrip())
        if trailing > leading:
            result.append({
                "chunk_index": len(result),
                "char_start": start + leading,
                "char_end": start + trailing,
                "text": piece[leading:trailing],
            })
        if len(result) > MAX_CHUNKS:
            raise ValueError("Document contains too many chunks")
    return result


def process_document(text: str, filename: str, *, encoder=None) -> dict:
    if not isinstance(text, str) or not text.strip() or "\x00" in text:
        raise ValueError("Expected nonempty UTF-8 document text")
    raw = text.encode("utf-8")
    if len(raw) > MAX_DOCUMENT_BYTES:
        raise ValueError("Document exceeds 24 KiB")
    if not isinstance(filename, str) or not filename.lower().endswith((".txt", ".md")):
        raise ValueError("Unsupported document filename")

    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("No document chunks")
    if encoder is None:
        from pipeline import OnnxEncoder
        encoder = OnnxEncoder()
    import math
    vectors = list(encoder.encode([chunk["text"] for chunk in chunks]))
    if len(vectors) != len(chunks):
        raise ValueError("Encoder returned wrong number of vectors")
    rows = []
    dimension = None
    for chunk, vector in zip(chunks, vectors):
        values = [float(x) for x in vector]
        if not values or (dimension is not None and len(values) != dimension):
            raise ValueError("Inconsistent vector dimensions")
        if any(not math.isfinite(x) for x in values):
            raise ValueError("Non-finite document embedding")
        dimension = len(values)
        rows.append({**chunk, "source": filename, "embedding": values})
    return {
        "source": filename,
        "sha256": sha256(raw).hexdigest().upper(),
        "model": "BAAI/bge-small-en-v1.5",
        "segments": rows,
    }
