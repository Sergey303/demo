"""Audio transcript segments into searchable time-attributed passages."""
from dataclasses import dataclass
from pathlib import Path
import math


@dataclass(frozen=True)
class Segment:
    start: float
    end: float
    text: str


def validate_segments(segments):
    previous = 0.0
    for segment in segments:
        if not all(math.isfinite(x) for x in (segment.start, segment.end)):
            raise ValueError('Non-finite timestamps')
        if segment.start < previous or segment.end <= segment.start:
            raise ValueError('Segments must be ordered and non-overlapping')
        previous = segment.end


def passages(segments, audio_name):
    validate_segments(segments)
    return [{'source':audio_name, 'start':s.start, 'end':s.end, 'text':s.text.strip()}
            for s in segments if s.text.strip()]


def transcribe(audio: Path, model_name='tiny'):
    """Optional local OpenAI Whisper inference; weights downloaded on first use."""
    if not audio.is_file():
        raise FileNotFoundError(audio)
    import whisper
    model = whisper.load_model(model_name)
    result = model.transcribe(str(audio), fp16=False)
    segments = [Segment(float(s['start']), float(s['end']), str(s['text'])) for s in result['segments']]
    return passages(segments, audio.name)
