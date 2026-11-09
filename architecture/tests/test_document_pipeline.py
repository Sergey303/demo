"""Document ingestion unit tests, independent of model downloads or PostgreSQL."""
import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from document_pipeline import CHUNK_CHARS, MAX_DOCUMENT_BYTES, chunk_text, process_document


class FakeEncoder:
    def __init__(self):
        self.seen = []
    def encode(self, texts):
        self.seen.extend(texts)
        return [[float(i + 1), 0.75] for i in range(len(texts))]


def test_chunk_offsets_reconstruct_original_evidence():
    text = "First paragraph.\n\n" + "Second sentence. " * 90 + "\nThe ending."
    parts = chunk_text(text, size=90)
    assert len(parts) >= 10
    assert [p['chunk_index'] for p in parts] == list(range(len(parts)))
    assert all(0 <= p['char_start'] < p['char_end'] <= len(text) for p in parts)
    assert all(text[p['char_start']:p['char_end']] == p['text'] for p in parts)
    assert all(len(part['text']) <= 90 for part in parts)


def test_document_result_persists_compatible_embeddings_and_offsets():
    encoder = FakeEncoder()
    text = "Refund policy: 30 days.\n\nThis policy is for the demo."
    result = process_document(text, "policy.md", encoder=encoder)
    assert result['source'] == "policy.md"
    assert result['model'] == "BAAI/bge-small-en-v1.5"
    assert len(result['sha256']) == 64
    assert result['segments'][0]['text'].startswith("Refund")
    assert result['segments'][0]['source'] == "policy.md"
    assert len(result['segments'][0]['embedding']) == 2
    assert encoder.seen == [p['text'] for p in result['segments']]


@pytest.mark.parametrize("text", ["", " \n\t ", "hello\x00world", "x" * (MAX_DOCUMENT_BYTES + 1)])
def test_invalid_document_content_rejected(text):
    with pytest.raises(ValueError):
        process_document(text, "policy.txt", encoder=FakeEncoder())


def test_encoder_failure_is_not_persisted():
    class Broken:
        def encode(self, texts):
            return [[float("nan")] for _ in texts]
    with pytest.raises(ValueError):
        process_document("important", "policy.txt", encoder=Broken())
    class WrongNumber:
        def encode(self, texts):
            return []
    with pytest.raises(ValueError):
        process_document("important", "policy.txt", encoder=WrongNumber())


def test_long_lines_preserve_unicode_boundaries():
    original = "Межзвёздный договор\n" * 46
    for chunk in chunk_text(original):
        assert chunk['text'] == original[chunk['char_start']:chunk['char_end']]
