"""Local end-to-end audio transcription and semantic search (CPU-capable)."""
import argparse
from dataclasses import asdict
import json
from pathlib import Path
from time import perf_counter

from core import Segment, passages
from search import TranscriptIndex


class OnnxEncoder:
    def __init__(self, model_name='BAAI/bge-small-en-v1.5'):
        from fastembed import TextEmbedding
        self.model = TextEmbedding(model_name=model_name)

    def encode(self, texts):
        return list(self.model.embed(texts))


def recognize(audio: Path, model_name='tiny.en'):
    """OpenAI Whisper weights via CPU-friendly faster-whisper (CTranslate2)."""
    if not audio.is_file():
        raise FileNotFoundError(audio)
    from faster_whisper import WhisperModel
    model = WhisperModel(model_name, device='cpu', compute_type='int8')
    segments, _ = model.transcribe(str(audio), language='en', beam_size=1)
    return passages([Segment(float(s.start), float(s.end), s.text) for s in segments], audio.name)


def execute(files, question, *, transcriber=recognize, encoder=None, k=3):
    if k < 1 or not question.strip():
        raise ValueError('Expected a question and positive k')
    started = perf_counter()
    records = []
    for audio in files:
        records.extend(transcriber(audio))
    recognition_s = perf_counter() - started
    started = perf_counter()
    index = TranscriptIndex(records, encoder if encoder is not None else OnnxEncoder())
    index_s = perf_counter() - started
    started = perf_counter()
    hits = [asdict(x) for x in index.search(question, k)]
    search_s = perf_counter() - started
    return {'files':len(files), 'segments':len(records), 'hits':hits,
            'timing_seconds':{'transcription':round(recognition_s,3),
                              'index':round(index_s,3),'search':round(search_s,5)}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('audio', nargs='+', type=Path)
    parser.add_argument('--question', required=True)
    parser.add_argument('--k', type=int, default=3)
    args = parser.parse_args()
    print(json.dumps(execute(args.audio,args.question,k=args.k), indent=2))


if __name__ == '__main__':
    main()
