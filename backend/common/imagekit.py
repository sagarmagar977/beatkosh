import base64
import json
import mimetypes
import uuid
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


UPLOAD_ENDPOINT = "https://upload.imagekit.io/api/v1/files/upload"


@dataclass(frozen=True)
class ImageKitConfig:
    public_key: str
    private_key: str
    url_endpoint: str
    media_root: str


def imagekit_enabled() -> bool:
    return bool(getattr(settings, "IMAGEKIT_ENABLED", False))


def get_imagekit_config() -> ImageKitConfig:
    config = ImageKitConfig(
        public_key=getattr(settings, "IMAGEKIT_PUBLIC_KEY", "").strip(),
        private_key=getattr(settings, "IMAGEKIT_PRIVATE_KEY", "").strip(),
        url_endpoint=getattr(settings, "IMAGEKIT_URL_ENDPOINT", "").strip().rstrip("/"),
        media_root=getattr(settings, "IMAGEKIT_MEDIA_ROOT", "").strip().strip("/"),
    )
    if not config.private_key or not config.url_endpoint or not config.media_root:
        raise ImproperlyConfigured(
            "ImageKit is enabled but IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT, or IMAGEKIT_MEDIA_ROOT is missing.",
        )
    return config


def normalize_media_name(name: str) -> str:
    return str(Path(name).as_posix()).lstrip("/")


def build_imagekit_media_url(name: str) -> str:
    normalized_name = normalize_media_name(name)
    if not normalized_name:
        return ""
    if normalized_name.startswith(("http://", "https://")):
        return normalized_name
    config = get_imagekit_config()
    encoded_name = quote(f"{config.media_root}/{normalized_name}", safe="/")
    return f"{config.url_endpoint}/{encoded_name}"


def _encode_multipart_form_data(
    fields: dict[str, str],
    file_field: str,
    file_name: str,
    content: bytes,
) -> tuple[bytes, str]:
    boundary = f"----ImageKitBoundary{uuid.uuid4().hex}"
    lines: list[bytes] = []

    for key, value in fields.items():
        lines.extend(
            [
                f"--{boundary}".encode(),
                f'Content-Disposition: form-data; name="{key}"'.encode(),
                b"",
                str(value).encode(),
            ]
        )

    content_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"
    lines.extend(
        [
            f"--{boundary}".encode(),
            f'Content-Disposition: form-data; name="{file_field}"; filename="{file_name}"'.encode(),
            f"Content-Type: {content_type}".encode(),
            b"",
            content,
            f"--{boundary}--".encode(),
            b"",
        ]
    )
    return b"\r\n".join(lines), boundary


def upload_media_file(name: str, content, overwrite: bool = True) -> dict:
    config = get_imagekit_config()
    normalized_name = normalize_media_name(name)
    if not normalized_name:
        raise ValueError("A file name is required for ImageKit uploads.")

    parent = str(Path(normalized_name).parent.as_posix())
    folder = f"/{config.media_root}"
    if parent and parent != ".":
        folder = f"{folder}/{parent}"

    if hasattr(content, "seek"):
        content.seek(0)
    raw = content.read() if hasattr(content, "read") else content
    if not isinstance(raw, (bytes, bytearray)):
        raise TypeError("ImageKit uploads require bytes or a readable binary file object.")

    body, boundary = _encode_multipart_form_data(
        fields={
            "fileName": Path(normalized_name).name,
            "folder": folder,
            "useUniqueFileName": "false",
            "overwriteFile": "true" if overwrite else "false",
        },
        file_field="file",
        file_name=Path(normalized_name).name,
        content=bytes(raw),
    )

    token = base64.b64encode(f"{config.private_key}:".encode()).decode()
    request = Request(
        UPLOAD_ENDPOINT,
        data=body,
        headers={
            "Authorization": f"Basic {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )
    with urlopen(request, timeout=60) as response:
        payload = json.loads(response.read().decode())

    if payload.get("error"):
        raise RuntimeError(payload.get("message") or "ImageKit upload failed.")
    return payload


def open_remote_media(name: str) -> BytesIO:
    url = build_imagekit_media_url(name)
    if not url:
        raise FileNotFoundError("No remote media path was provided.")
    with urlopen(url, timeout=60) as response:
        data = response.read()
    file_obj = BytesIO(data)
    file_obj.name = Path(name).name
    return file_obj
