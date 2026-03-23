from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models


class User(AbstractUser):
    AUTH_PROVIDER_LOCAL = "local"
    AUTH_PROVIDER_GOOGLE = "google"
    AUTH_PROVIDER_CHOICES = (
        (AUTH_PROVIDER_LOCAL, "Local"),
        (AUTH_PROVIDER_GOOGLE, "Google"),
    )

    ROLE_ARTIST = "artist"
    ROLE_PRODUCER = "producer"
    ROLE_CHOICES = (
        (ROLE_ARTIST, "Artist"),
        (ROLE_PRODUCER, "Producer"),
    )

    email = models.EmailField(unique=True)
    auth_provider = models.CharField(max_length=20, choices=AUTH_PROVIDER_CHOICES, default=AUTH_PROVIDER_LOCAL)
    google_sub = models.CharField(max_length=255, unique=True, null=True, blank=True)
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
    avatar_obj = models.FileField(upload_to="profiles/producers/", blank=True, null=True)
    headline = models.CharField(max_length=160, blank=True)
    bio = models.TextField(blank=True)
    genres = models.CharField(max_length=255, blank=True)
    experience_years = models.PositiveIntegerField(default=0)
    portfolio_links = models.JSONField(default=dict, blank=True)
    service_offerings = models.JSONField(default=list, blank=True)
    featured_beat_ids = models.JSONField(default=list, blank=True)
    accepts_custom_singles = models.BooleanField(default=True)
    accepts_album_projects = models.BooleanField(default=False)
    onboarding_notes = models.TextField(blank=True)
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


class UserNotification(models.Model):
    TYPE_BEAT_LIKED = "beat_liked"
    TYPE_CHOICES = (
        (TYPE_BEAT_LIKED, "Beat liked"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="triggered_notifications")
    beat = models.ForeignKey("beats.Beat", on_delete=models.CASCADE, related_name="notifications", null=True, blank=True)
    notification_type = models.CharField(max_length=40, choices=TYPE_CHOICES)
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)


class ProducerSellerAgreement(models.Model):
    producer = models.OneToOneField(User, on_delete=models.CASCADE, related_name="seller_agreement")
    accepted_version = models.CharField(max_length=40, default="v1")
    accepted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self) -> str:
        return f"SellerAgreement<{self.producer.username}>"


class LibraryListenLater(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="listen_later_entries")
    beat = models.ForeignKey("beats.Beat", on_delete=models.CASCADE, related_name="listen_later_entries")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "beat")
        ordering = ("-created_at",)


class LibraryPlaylist(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="beat_playlists")
    name = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("owner", "name")
        ordering = ("-updated_at", "-created_at")

    def __str__(self) -> str:
        return f"Playlist<{self.owner.username}:{self.name}>"


class LibraryPlaylistItem(models.Model):
    playlist = models.ForeignKey(LibraryPlaylist, on_delete=models.CASCADE, related_name="items")
    beat = models.ForeignKey("beats.Beat", on_delete=models.CASCADE, related_name="playlist_items")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("playlist", "beat")
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"PlaylistItem<{self.playlist_id}:{self.beat_id}>"
