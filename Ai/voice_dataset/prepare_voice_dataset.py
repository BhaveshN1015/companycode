"""Reusable raw-recording to speaker-separated TTS dataset preparation.

This script deliberately never edits the legacy dialect-level metadata.csv or
existing audio files. New clips and their authoritative metadata are written
under <dialect>/speakers/<speaker_id>/.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import re
import sys
import tempfile
import wave
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

SAMPLE_RATE = 22050
CHANNELS = 1
MIN_CLIP_SECONDS = 0.35
MAX_CLIP_SECONDS = 20.0
DEFAULT_MODEL = "small"
MEDIA_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".opus", ".aac", ".mp4", ".mkv", ".webm", ".mov", ".avi"}
FIELDNAMES = [
    "id", "filename", "speaker_id", "language", "dialect", "source_file",
    "start_time", "end_time", "text", "duration", "needs_review", "processed_at",
]
_WHISPER_MODELS: dict[str, Any] = {}


@dataclass
class ClipRecord:
    id: str
    filename: str
    speaker_id: str
    language: str
    dialect: str
    source_file: str
    start_time: float
    end_time: float
    text: str
    duration: float
    needs_review: bool
    processed_at: str


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def atomic_json_write(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temp = Path(handle.name)
    temp.replace(path)


def speaker_from_filename(path: Path) -> str:
    """Use an explicit filename prefix; never guess a speaker acoustically."""
    stem = path.stem
    match = re.match(r"^(?P<speaker>.+?)[_-](?:video)?\d+(?:[_-].*)?$", stem, re.IGNORECASE)
    speaker = match.group("speaker") if match else stem.split("_")[0]
    speaker = re.sub(r"[^A-Za-z0-9.-]+", "_", speaker).strip("_.-")
    return speaker.lower() or "speaker_unknown"


def load_speakers(path: Path) -> dict[str, dict[str, Any]]:
    if not path.is_file():
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
        return value if isinstance(value, dict) else {}
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Invalid speakers.json: {exc}") from exc


def load_manifest(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {"version": 1, "sources": {}}
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
        if isinstance(value, dict) and isinstance(value.get("sources"), dict):
            return value
    except (OSError, json.JSONDecodeError):
        logging.warning("Ignoring unreadable manifest: %s", path)
    return {"version": 1, "sources": {}}


def numeric_ids(root: Path) -> set[int]:
    ids: set[int] = set()
    for path in root.rglob("*.wav"):
        match = re.match(r"^(\d+)\.wav$", path.name, re.IGNORECASE)
        if match:
            ids.add(int(match.group(1)))
    return ids


def next_id(used: set[int]) -> int:
    candidate = max(used, default=0) + 1
    while candidate in used:
        candidate += 1
    used.add(candidate)
    return candidate


def decode_media(path: Path) -> tuple[Any, int]:
    """Decode any supported media through PyAV without touching the source."""
    import av
    import numpy as np

    container = av.open(str(path))
    try:
        stream = next((item for item in container.streams if item.type == "audio"), None)
        if stream is None:
            raise ValueError("media contains no audio stream")
        resampler = av.audio.resampler.AudioResampler(format="s16", layout="mono", rate=SAMPLE_RATE)
        chunks = []
        for frame in container.decode(stream):
            for converted in resampler.resample(frame):
                chunks.append(converted.to_ndarray().reshape(-1))
        if not chunks:
            raise ValueError("audio stream contains no decodable frames")
        return np.concatenate(chunks).astype(np.int16), SAMPLE_RATE
    finally:
        container.close()


def write_wav(path: Path, samples: Any, sample_rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(CHANNELS)
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        handle.writeframes(samples.tobytes())


def rms_db(samples: Any) -> float:
    import numpy as np
    values = samples.astype(np.float32) / 32768.0
    rms = float(np.sqrt(np.mean(values * values))) if len(values) else 0.0
    return 20.0 * __import__("math").log10(max(rms, 1e-9))


def clean_segments(samples: Any, start: float, end: float) -> Iterable[tuple[float, float, Any]]:
    """Reject silence and extreme durations; Whisper supplies sentence boundaries."""
    import numpy as np
    left = max(0, int(start * SAMPLE_RATE))
    right = min(len(samples), int(end * SAMPLE_RATE))
    clip = samples[left:right]
    duration = len(clip) / SAMPLE_RATE
    if duration < MIN_CLIP_SECONDS or duration > MAX_CLIP_SECONDS:
        return
    if rms_db(clip) < -48.0:
        return
    if np.max(np.abs(clip.astype(np.int32))) < 32:
        return
    yield start, end, clip


def transcribe(samples: Any, model_name: str, language_code: str | None) -> list[dict[str, Any]]:
    from faster_whisper import WhisperModel
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as handle:
        temp = Path(handle.name)
    try:
        write_wav(temp, samples, SAMPLE_RATE)
        model = _WHISPER_MODELS.get(model_name)
        if model is None:
            model = WhisperModel(model_name, device="cpu", compute_type="int8")
            _WHISPER_MODELS[model_name] = model
        segments, _ = model.transcribe(str(temp), language=language_code, vad_filter=True, word_timestamps=True)
        return [
            {"start": float(item.start), "end": float(item.end), "text": item.text.strip()}
            for item in segments if item.text and item.text.strip()
        ]
    finally:
        temp.unlink(missing_ok=True)


def read_existing_records(path: Path) -> list[dict[str, str]]:
    if not path.is_file():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        sample = handle.read(4096)
        handle.seek(0)
        if "|" in sample and "," not in sample.splitlines()[0]:
            return []
        return list(csv.DictReader(handle))


def append_records(path: Path, records: list[ClipRecord]) -> None:
    if not records:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    needs_header = not path.exists() or path.stat().st_size == 0
    with path.open("a", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        if needs_header:
            writer.writeheader()
        for record in records:
            writer.writerow(asdict(record))


def export_piper(speaker_dir: Path, records: list[ClipRecord]) -> None:
    path = speaker_dir / "metadata_piper.csv"
    existing: set[str] = set()
    if path.is_file():
        with path.open("r", encoding="utf-8", newline="") as handle:
            existing = {line.rstrip("\n") for line in handle if line.strip()}
    with path.open("a", encoding="utf-8", newline="") as handle:
        for record in records:
            line = f"audio/{record.filename}|{record.text}"
            if line not in existing:
                handle.write(line + "\n")


def process_dialect(root: Path, dialect: str, args: argparse.Namespace) -> dict[str, Any]:
    dialect_dir = root / dialect
    raw_dir = dialect_dir / "raw"
    manifest_path = dialect_dir / "processing_manifest.json"
    report_path = dialect_dir / "processing_report.json"
    manifest = load_manifest(manifest_path)
    speakers = load_speakers(dialect_dir / "speakers.json")
    used_ids = numeric_ids(dialect_dir)
    raw_files = sorted(p for p in raw_dir.rglob("*") if p.is_file() and p.suffix.lower() in MEDIA_EXTENSIONS) if raw_dir.is_dir() else []
    language_label = args.language_label or dialect
    report: dict[str, Any] = {"language": language_label, "dialect": dialect, "started_at": utc_now(), "total_raw_files": len(raw_files), "successful_files": 0, "failed_files": 0, "total_duration_seconds": 0.0, "clips_created": 0, "skipped_clips": 0, "transcription_errors": [], "files": []}

    if args.dry_run:
        report["planned_files"] = [str(p.relative_to(dialect_dir)) for p in raw_files]
        report["finished_at"] = utc_now()
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return report

    for raw_path in raw_files:
        source_key = str(raw_path.relative_to(dialect_dir)).replace("\\", "/")
        digest = sha256_file(raw_path)
        if manifest["sources"].get(source_key, {}).get("sha256") == digest and manifest["sources"].get(source_key, {}).get("status") == "success":
            report["files"].append({"source_file": source_key, "status": "already_processed"})
            continue
        speaker_id = speaker_from_filename(raw_path)
        speaker_dir = dialect_dir / "speakers" / speaker_id
        audio_dir = speaker_dir / "audio"
        try:
            samples, _ = decode_media(raw_path)
            report["total_duration_seconds"] += round(len(samples) / SAMPLE_RATE, 3)
            segments = transcribe(samples, args.model, args.whisper_language)
            created: list[ClipRecord] = []
            for segment in segments:
                cleaned = list(clean_segments(samples, segment["start"], segment["end"]))
                if not cleaned:
                    report["skipped_clips"] += 1
                    continue
                start, end, clip = cleaned[0]
                clip_id = f"{next_id(used_ids):06d}"
                filename = f"{clip_id}.wav"
                output = audio_dir / filename
                if output.exists():
                    raise FileExistsError(f"Refusing to overwrite existing clip: {output}")
                write_wav(output, clip, SAMPLE_RATE)
                created.append(ClipRecord(clip_id, filename, speaker_id, language_label, dialect, source_key, round(start, 3), round(end, 3), segment["text"], round(end - start, 3), True, utc_now()))
            append_records(speaker_dir / "metadata.csv", created)
            export_piper(speaker_dir, created)
            manifest["sources"][source_key] = {"sha256": digest, "status": "success", "speaker_id": speaker_id, "clips": [item.id for item in created], "processed_at": utc_now()}
            report["successful_files"] += 1
            report["clips_created"] += len(created)
            report["files"].append({"source_file": source_key, "status": "success", "speaker_id": speaker_id, "clips": len(created)})
        except Exception as exc:
            logging.exception("Failed processing %s", raw_path)
            manifest["sources"][source_key] = {"sha256": digest, "status": "failed", "error": str(exc), "processed_at": utc_now()}
            report["failed_files"] += 1
            report["transcription_errors"].append({"source_file": source_key, "error": str(exc)})
            report["files"].append({"source_file": source_key, "status": "failed", "error": str(exc)})
        atomic_json_write(manifest_path, manifest)

    report["finished_at"] = utc_now()
    atomic_json_write(report_path, report)
    return report


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Prepare speaker-separated multilingual TTS data; never trains a model.")
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--language", help="Dialect folder to process, e.g. marwari")
    selection.add_argument("--all", action="store_true", help="Process every dialect containing raw recordings")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent, help="voice_dataset root")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Faster-Whisper model name/path")
    parser.add_argument("--whisper-language", default=None, help="Whisper language code; omit for auto-detect")
    parser.add_argument("--language-label", default=None, help="Metadata language label; defaults to --language")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--review", action="store_true", help="Print generated items requiring transcript review")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    root = args.root.resolve()
    dialects = [args.language] if args.language else sorted(p.name for p in root.iterdir() if p.is_dir() and (p / "raw").is_dir())
    for dialect in dialects:
        report = process_dialect(root, dialect, args)
        print(f"{dialect}: {report.get('clips_created', 0)} clips, {report['successful_files']} successful, {report['failed_files']} failed")
        if args.review:
            for metadata_path in (root / dialect / "speakers").glob("*/metadata.csv"):
                with metadata_path.open("r", encoding="utf-8-sig", newline="") as handle:
                    for row in csv.DictReader(handle):
                        if str(row.get("needs_review", "")).lower() == "true":
                            print(f"REVIEW {dialect}/{metadata_path.parent.name}/{row.get('filename')}: {row.get('text', '')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())