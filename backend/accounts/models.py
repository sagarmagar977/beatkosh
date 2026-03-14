from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models


class User(AbstractUser):
    ROLE_ARTIST = "artist"
    ROLE_PRODUCER = "producer"
    ROLE_CHOICES = (
        (ROLE_ARTIST, "Artist"),
        (ROLE_PRODUCER, "Producer"),
    )

    email = models.EmailField(unique=True)
    is_artist = models.BooleanField(default=True)
    is_producer = models.BooleanField(default=False)
    active_role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_ARTIST)

    def clean(self):
        if not self.is_artist and not self.is_producer:
            raise ValidationError("User must have at least one role enabled.")
        if self.active_role == self.ROLE_ARTIST and not self.is_artist:
            raise ValidationError("Active role artist requires is_artist=True.")
        if self.active_role == self.ROLE_PRODUCER and not self.is_producer:
            raise ValidationError("Active role producer requires is_producer=True.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class ArtistProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="artist_profile")
    stage_name = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True)
    genres = models.CharField(max_length=255, blank=True)
    social_links = models.JSONField(default=dict, blank=True)
    verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"ArtistProfile<{self.user.username}>"


class ProducerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="producer_profile")
    producer_name = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True)
    genres = models.CharField(max_length=255, blank=True)
    experience_years = models.PositiveIntegerField(default=0)
    portfolio_links = models.JSONField(default=dict, blank=True)
    verified = models.BooleanField(default=False)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_sales = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"ProducerProfile<{self.user.username}>"


class ProducerFollow(models.Model):
    artist = models.ForeignKey(User, on_delete=models.CASCADE, related_name="following_relations")
    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="follower_relations")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("artist", "producer")
        ordering = ("-created_at",)


class BeatLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="beat_likes")
    beat = models.ForeignKey("beats.Beat", on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "beat")
        ordering = ("-created_at",)
