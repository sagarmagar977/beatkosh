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


class ActivityDrop(models.Model):
    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="activity_drops")
    beat = models.ForeignKey(Beat, on_delete=models.CASCADE, null=True, blank=True, related_name="activity_drops")
    message = models.CharField(max_length=280, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

# Create your models here.
