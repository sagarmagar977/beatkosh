import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from django.conf import settings
from django.core.files import File

from beats.models import Beat, BeatUploadDraft


def _ffmpeg_binary() -> str | None:
    configured = getattr(settings, "FFMPEG_BINARY", "ffmpeg")
    return shutil.which(configured) or shutil.which("ffmpeg")


def _build_preview_name(original_name: str, target_prefix: str) -> str:
    stem = Path(original_name).stem
    return f"{target_prefix}/{stem}_preview.mp3"


def _transcode_preview(source_path: str, output_path: str) -> None:
    ffmpeg_bin = _ffmpeg_binary()
    if not ffmpeg_bin:
        raise RuntimeError("ffmpeg binary not found in PATH")

    bitrate = str(getattr(settings, "AUDIO_PREVIEW_BITRATE", "128k"))
    duration = int(getattr(settings, "AUDIO_PREVIEW_MAX_SECONDS", 45))

    command = [
        ffmpeg_bin,
        "-y",
        "-i",
        source_path,
        "-vn",
        "-acodec",
        "libmp3lame",
        "-b:a",
        bitrate,
        "-ac",
        "2",
        "-ar",
        "44100",
        "-t",
        str(duration),
        output_path,
    ]
    subprocess.run(command, check=True, capture_output=True, text=True)


def _generate_preview_for_instance(instance, source_field: str, preview_field: str, preview_prefix: str) -> bool:
    source = getattr(instance, source_field, None)
    preview = getattr(instance, preview_field, None)
    if not source or preview:
        return False
    source_path = getattr(source, "path", None)
    if not source_path or not os.path.exists(source_path):
        return False

    temp_preview = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    temp_preview.close()
    try:
        _transcode_preview(source_path, temp_preview.name)
        target_name = _build_preview_name(source.name, preview_prefix)
        with open(temp_preview.name, "rb") as preview_handle:
            getattr(instance, preview_field).save(target_name, File(preview_handle), save=False)
        instance.save(update_fields=[preview_field])
        return True
    finally:
        if os.path.exists(temp_preview.name):
            os.unlink(temp_preview.name)


def generate_stream_preview_for_beat(beat: Beat) -> bool:
    return _generate_preview_for_instance(
        beat,
        source_field="audio_file_obj",
        preview_field="preview_audio_obj",
        preview_prefix="beats/preview",
    )


def generate_stream_preview_for_draft(draft: BeatUploadDraft) -> bool:
    return _generate_preview_for_instance(
        draft,
        source_field="audio_file_obj",
        preview_field="preview_audio_obj",
        preview_prefix="beats/drafts/preview",
    )
