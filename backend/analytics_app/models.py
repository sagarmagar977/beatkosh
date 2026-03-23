from django.db import models

from beats.models import Beat
from accounts.models import User


class AnalyticsEvent(models.Model):
    EVENT_PLAY = "play"
    EVENT_SALE = "sale"
    EVENT_SKIP = "skip"
    EVENT_CHOICES = (
        (EVENT_PLAY, "Play"),
        (EVENT_SALE, "Sale"),
        (EVENT_SKIP, "Skip"),
    )

    event_type = models.CharField(max_length=20, choices=EVENT_CHOICES)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="analytics_events")
    producer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="producer_analytics_events",
    )
    beat_id = models.PositiveIntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ListeningHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="listening_history")
    beat = models.ForeignKey(Beat, on_delete=models.CASCADE, related_name="listening_events")
    play_count = models.PositiveIntegerField(default=0)
    last_played_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "beat")
        ordering = ("-last_played_at",)


class ListeningSession(models.Model):
    END_REASON_SWITCH = "switch"
    END_REASON_PAUSE = "pause"
    END_REASON_ENDED = "ended"
    END_REASON_CLOSE = "close"
    END_REASON_UNKNOWN = "unknown"
    END_REASON_CHOICES = (
        (END_REASON_SWITCH, "Switch"),
        (END_REASON_PAUSE, "Pause"),
        (END_REASON_ENDED, "Ended"),
        (END_REASON_CLOSE, "Close"),
        (END_REASON_UNKNOWN, "Unknown"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="listening_sessions")
    beat = models.ForeignKey(Beat, on_delete=models.CASCADE, related_name="listening_sessions")
    source = models.CharField(max_length=80, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    last_event_at = models.DateTimeField(auto_now=True)
    listened_seconds = models.PositiveIntegerField(default=0)
    duration_seconds = models.PositiveIntegerField(default=0)
    completion_percent = models.PositiveIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    is_skipped = models.BooleanField(default=False)
    end_reason = models.CharField(max_length=20, choices=END_REASON_CHOICES, default=END_REASON_UNKNOWN)

    class Meta:
        ordering = ("-started_at", "-id")


class UserTasteProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="taste_profile")
    favorite_genres = models.JSONField(default=list, blank=True)
    favorite_moods = models.JSONField(default=list, blank=True)
    favorite_instruments = models.JSONField(default=list, blank=True)
    favorite_producer_ids = models.JSONField(default=list, blank=True)
    liked_genres = models.JSONField(default=list, blank=True)
    bpm_min = models.PositiveIntegerField(default=0)
    bpm_max = models.PositiveIntegerField(default=0)
    bpm_average = models.PositiveIntegerField(default=0)
    today_snapshot = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)


class ActivityDrop(models.Model):
    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="activity_drops")
    beat = models.ForeignKey(Beat, on_delete=models.CASCADE, null=True, blank=True, related_name="activity_drops")
    message = models.CharField(max_length=280, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
