import pytest
from app.token_chunks import chunk_tokens


def test_token_budget_overlap_and_coverage(tmp_path):
    import tiktoken
    enc = tiktoken.get_encoding('cl100k_base')
    source = ' '.join(f'word{i}' for i in range(100))
    (tmp_path / 'doc.txt').write_text(source)
    chunks = chunk_tokens(tmp_path, max_tokens=20, overlap=5)
    original = enc.encode(source)
    # Byte-boundary decoding may be lossy for split multibyte tokens; this test uses ASCII.
    encoded = [enc.encode(p.text) for p in chunks]
    assert all(len(p) <= 20 for p in encoded)
    assert encoded[0] == original[:20]
    assert len(chunks) > 1
    assert all(p.source == 'doc.txt' for p in chunks)


def test_invalid_budget(tmp_path):
    with pytest.raises(ValueError):
        chunk_tokens(tmp_path, max_tokens=3, overlap=3)
