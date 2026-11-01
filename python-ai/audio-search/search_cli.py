"""Query local audio transcripts using local ONNX neural embeddings.

Usage: python search_cli.py transcripts.json 'find refund discussion'
transcripts.json is a list of records from core.transcribe(); no network API.
"""
import argparse
from dataclasses import asdict
import json
from pathlib import Path
from search import TranscriptIndex


class OnnxEncoder:
    def __init__(self, model='BAAI/bge-small-en-v1.5'):
        from fastembed import TextEmbedding
        self.model = TextEmbedding(model_name=model)

    def encode(self, texts):
        return list(self.model.embed(texts))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('transcripts', type=Path)
    parser.add_argument('question')
    parser.add_argument('--k', type=int, default=3)
    parser.add_argument('--source')
    args = parser.parse_args()
    records = json.loads(args.transcripts.read_text(encoding='utf8'))
    if not isinstance(records, list):
        parser.error('transcripts must contain a JSON list of records')
    index = TranscriptIndex(records, OnnxEncoder())
    print(json.dumps([asdict(hit) for hit in index.search(args.question, args.k, args.source)], indent=2))


if __name__ == '__main__':
    main()
