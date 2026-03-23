from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from math import pow

from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from accounts.models import BeatLike
from analytics_app.models import AnalyticsEvent
from beats.models import Beat, BeatTrendSnapshot
from orders.models import PurchaseLicense

TREND_LIMIT = 20
TREND_EXPONENT = 1.8
TREND_HOUR_OFFSET = 2
TREND_WINDOWS = {
    BeatTrendSnapshot.PERIOD_DAILY: timedelta(days=1),
    BeatTrendSnapshot.PERIOD_WEEKLY: timedelta(days=7),
}


@dataclass
class TrendRefreshResult:
    period: str
    snapshot_count: int


def calculate_trending_score(*, likes: int, plays: int, purchases: int, hours_since_upload: float) -> float:
    numerator = likes + (plays * 0.1) + (purchases * 5)
    if numerator <= 0:
        return 0.0
    denominator = pow(hours_since_upload + TREND_HOUR_OFFSET, TREND_EXPONENT)
    return round(numerator / denominator, 6)


def _aggregate_counts(*, period_start, now):
    play_counts = dict(
        AnalyticsEvent.objects.filter(
            event_type=AnalyticsEvent.EVENT_PLAY,
            created_at__gte=period_start,
            created_at__lte=now,
            beat_id__isnull=False,
        )
        .values("beat_id")
        .annotate(total=Count("id"))
        .values_list("beat_id", "total")
    )
    like_counts = dict(
        BeatLike.objects.filter(created_at__gte=period_start, created_at__lte=now, beat__is_active=True)
        .values("beat_id")
        .annotate(total=Count("id"))
        .values_list("beat_id", "total")
    )
    purchase_counts = dict(
        PurchaseLicense.objects.filter(created_at__gte=period_start, created_at__lte=now, beat__is_active=True)
        .values("beat_id")
        .annotate(total=Count("id"))
        .values_list("beat_id", "total")
    )
    return play_counts, like_counts, purchase_counts


def refresh_trending_snapshots(*, periods: list[str] | tuple[str, ...] | None = None, now=None) -> list[TrendRefreshResult]:
    current_time = now or timezone.now()
    active_periods = list(periods or TREND_WINDOWS.keys())
    results: list[TrendRefreshResult] = []

    for period in active_periods:
        window = TREND_WINDOWS[period]
        period_start = current_time - window
        play_counts, like_counts, purchase_counts = _aggregate_counts(period_start=period_start, now=current_time)
        candidate_ids = set(play_counts) | set(like_counts) | set(purchase_counts)
        snapshots: list[BeatTrendSnapshot] = []

        if candidate_ids:
            beats = Beat.objects.filter(id__in=candidate_ids, is_active=True).only("id", "created_at")
            ranked_rows = []
            for beat in beats:
                plays = int(play_counts.get(beat.id, 0) or 0)
                likes = int(like_counts.get(beat.id, 0) or 0)
                purchases = int(purchase_counts.get(beat.id, 0) or 0)
                hours_since_upload = max((current_time - beat.created_at).total_seconds() / 3600, 0)
                score = calculate_trending_score(
                    likes=likes,
                    plays=plays,
                    purchases=purchases,
                    hours_since_upload=hours_since_upload,
                )
                if score <= 0:
                    continue
                ranked_rows.append({
                    "beat_id": beat.id,
                    "score": score,
                    "plays": plays,
                    "likes": likes,
                    "purchases": purchases,
                    "created_at": beat.created_at,
                })

            ranked_rows.sort(
                key=lambda item: (item["score"], item["purchases"], item["likes"], item["plays"], item["created_at"]),
                reverse=True,
            )
            for rank, row in enumerate(ranked_rows[:TREND_LIMIT], start=1):
                snapshots.append(
                    BeatTrendSnapshot(
                        beat_id=row["beat_id"],
                        period=period,
                        rank=rank,
                        score=row["score"],
                        plays=row["plays"],
                        likes=row["likes"],
                        purchases=row["purchases"],
                    )
                )

        with transaction.atomic():
            BeatTrendSnapshot.objects.filter(period=period).delete()
            if snapshots:
                BeatTrendSnapshot.objects.bulk_create(snapshots, batch_size=TREND_LIMIT)

        results.append(TrendRefreshResult(period=period, snapshot_count=len(snapshots)))

    return results
