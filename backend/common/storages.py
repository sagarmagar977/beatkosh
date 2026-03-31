from django.core.files.base import File
from django.core.files.storage import Storage

from common.imagekit import build_imagekit_media_url, normalize_media_name, open_remote_media, upload_media_file


class ImageKitStorage(Storage):
    def _open(self, name, mode="rb"):
        if mode != "rb":
            raise ValueError("ImageKitStorage only supports binary read mode.")
        buffer = open_remote_media(name)
        return File(buffer, name=normalize_media_name(name))

    def _save(self, name, content):
        normalized_name = normalize_media_name(name)
        upload_media_file(normalized_name, content, overwrite=True)
        return normalized_name

    def delete(self, name):
        return None

    def exists(self, name):
        return False

    def get_available_name(self, name, max_length=None):
        normalized_name = normalize_media_name(name)
        if max_length and len(normalized_name) > max_length:
            raise ValueError("File name exceeds the configured max_length.")
        return normalized_name

    def size(self, name):
        with self._open(name) as uploaded_file:
            return uploaded_file.size

    def url(self, name):
        return build_imagekit_media_url(name)
