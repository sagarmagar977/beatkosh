from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from common.imagekit import get_imagekit_config, upload_media_file


class Command(BaseCommand):
    help = "Upload existing local media files to ImageKit while preserving the current folder structure."

    def _write_safe(self, message: str):
        safe_message = message.encode("cp1252", errors="backslashreplace").decode("cp1252")
        self.stdout.write(safe_message)

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            default=str(settings.MEDIA_ROOT),
            help="Local media directory to upload. Defaults to settings.MEDIA_ROOT.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show which files would be uploaded without sending them to ImageKit.",
        )

    def handle(self, *args, **options):
        get_imagekit_config()

        source = Path(options["source"]).resolve()
        if not source.exists():
            raise CommandError(f"Source directory does not exist: {source}")
        if not source.is_dir():
            raise CommandError(f"Source path is not a directory: {source}")

        files = [path for path in source.rglob("*") if path.is_file()]
        if not files:
            self.stdout.write(self.style.WARNING(f"No files found under {source}"))
            return

        uploaded = 0
        for file_path in files:
            relative_path = file_path.relative_to(source).as_posix()
            if options["dry_run"]:
                self._write_safe(f"DRY RUN {relative_path}")
                continue

            with file_path.open("rb") as local_file:
                upload_media_file(relative_path, local_file, overwrite=True)
            uploaded += 1
            self._write_safe(self.style.SUCCESS(f"Uploaded {relative_path}"))

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS(f"Dry run complete. {len(files)} files discovered under {source}."))
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Upload complete. {uploaded} files were copied from {source} to ImageKit root '{settings.IMAGEKIT_MEDIA_ROOT}'."
            )
        )
