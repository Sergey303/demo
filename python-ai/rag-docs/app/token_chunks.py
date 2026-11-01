"""Token-budgeted, overlapping chunks with no silent token loss."""
from pathlib import Path
from .core import Passage


def chunk_tokens(folder: Path, *, max_tokens: int = 256, overlap: int = 32, encoding_name: str = 'cl100k_base') -> list[Passage]:
    if max_tokens < 1 or not 0 <= overlap < max_tokens:
        raise ValueError('Require max_tokens > overlap >= 0')
    if not folder.is_dir():
        raise ValueError(f'Document directory not found: {folder}')
    import tiktoken
    enc = tiktoken.get_encoding(encoding_name)
    chunks = []
    step = max_tokens - overlap
    for path in sorted(folder.glob('*.md')) + sorted(folder.glob('*.txt')):
        tokens = enc.encode(path.read_text(encoding='utf8'), disallowed_special=())
        for start in range(0, len(tokens), step):
            window = tokens[start:start + max_tokens]
            if not window:
                break
            text = enc.decode(window)
            chunks.append(Passage(path.name, text))
            if start + max_tokens >= len(tokens):
                break
    return chunks
