# Whisper transcript source attribution

A small independent building block for audio-search RAG: `core.transcribe()` runs the open-source OpenAI Whisper model locally and turns timestamped segments into validated searchable records. It preserves original audio filename and start/end timestamps. It **does not** claim speaker diarization, word-level alignment or evaluated transcription quality.

`python -m pip install openai-whisper` installs optional inference dependencies (PyTorch and FFmpeg system executable are also required). `python -c 'from core import transcribe; print(transcribe(__import__("pathlib").Path("sample.wav")))'` runs inference on your own local audio. `pytest -q tests` tests timestamp handling without fetching weights. No recording or model is bundled. To integrate with neural retrieval, embed each record's `text` and return its `source` and time range with each hit.

## Timestamped semantic search

`search.TranscriptIndex` connects timestamp-attributed Whisper records with an injected text embedding model, builds normalized exact-search vectors in bounded batches, and returns the original file, start/end seconds, text and similarity score. It supports multiple files, an optional source filter, and deterministic ties. Search costs O(Nd + N log k), without an approximate-index recall penalty. Use an embedding adapter with `encode(list[str])` (for example Sentence Transformers or a local ONNX embedding model). Tests inject a deterministic encoder to check indexing and timestamps without implying that a speech model ran.

For a standalone local query, install `fastembed` and run `python search_cli.py transcripts.json 'Where was the refund discussed?'`. The input is a JSON list of `core.transcribe()` records. The ONNX embedding model is downloaded on first run and is **not** verified end-to-end in the unit tests; inference and disk indexing are intentionally outside the demonstrated core. No remote paid API is required. The CLI indexes in memory on each invocation, so this is intended for small local datasets.
