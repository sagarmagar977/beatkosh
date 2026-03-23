from django.core.management.base import BaseCommand

from beats.services.trending import refresh_trending_snapshots


class Command(BaseCommand):
    help = "Refresh daily and weekly beat trend snapshots."

    def handle(self, *args, **options):
        results = refresh_trending_snapshots()
        for result in results:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Refreshed {result.period} beat trends with {result.snapshot_count} snapshot rows."
                )
            )
