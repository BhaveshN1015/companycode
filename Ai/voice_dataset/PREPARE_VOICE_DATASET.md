# Voice Dataset Preparation

`prepare_voice_dataset.py` converts raw audio/video into speaker-separated,
reviewable WAV clips. It does not train or download a TTS model.

## Commands

From `Ai/voice_dataset`:

```powershell
python prepare_voice_dataset.py --language marwari
python prepare_voice_dataset.py --language marwari --dry-run
python prepare_voice_dataset.py --all
python prepare_voice_dataset.py --language marwari --review
```

Use `--whisper-language hi` for a dialect that should be transcribed as Hindi,
or omit it to let Faster-Whisper detect the language. `--language-label` can
store a project label such as `marwari` independently of the Whisper code.

## Speaker separation

The pipeline never performs unreliable automatic speaker guessing. It derives
the speaker ID from the filename prefix: `speakerA_video01.wav` becomes
`speakerA`. Add `speakers.json` for optional speaker metadata. Every output is
written to `speakers/<speaker_id>/audio/` and receives its own metadata file.

## Safety and idempotency

Existing dialect-level `metadata.csv` and existing audio are never changed.
New clips use the next unused numeric ID found anywhere below the dialect.
`processing_manifest.json` stores a SHA-256 hash and skips a source that was
already completed. Failed sources remain retryable.

Each generated row starts with `needs_review=true`. Correct the `text` field in
the speaker metadata CSV; the audio filename and source timing remain stable.

## Output

```text
<dialect>/
  speakers/<speaker_id>/
    audio/000123.wav
    metadata.csv
    metadata_piper.csv
  processing_manifest.json
  processing_report.json
```

`metadata_piper.csv` contains `audio/<filename>|<text>` rows. The master
speaker `metadata.csv` retains source file, timestamps, speaker, language,
dialect, duration, review status, and processing time.