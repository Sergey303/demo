# Whisper transcript source attribution

A small independent building block for audio-search RAG: `core.transcribe()` runs the open-source OpenAI Whisper model locally and turns timestamped segments into validated searchable records. It preserves original audio filename and start/end timestamps. It **does not** claim speaker diarization, word-level alignment or evaluated transcription quality.

`python -m pip install openai-whisper` installs optional inference dependencies (PyTorch and FFmpeg system executable are also required). `python -c 'from core import transcribe; print(transcribe(__import__("pathlib").Path("sample.wav")))'` runs inference on your own local audio. `pytest -q tests` tests timestamp handling without fetching weights. No recording or model is bundled. To integrate with neural retrieval, embed each record's `text` and return its `source` and time range with each hit.
