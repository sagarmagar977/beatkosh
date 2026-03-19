import hashlib

from django.db import models

from accounts.models import User
from beats.metadata_choices import (
    BEAT_TYPE_CHOICES,
    COMMERCIAL_MODE_CHOICES,
    GENRE_CHOICES,
    INSTRUMENT_CHOICES,
    KEY_CHOICES,
    LICENSE_PERIOD_CHOICES,
    MASTER_RECORDING_CHOICES,
    MOOD_CHOICES,
    PUBLISHING_RIGHTS_CHOICES,
)


class LicenseType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    streams_limit = models.PositiveIntegerField(null=True, blank=True)
    includes_wav = models.BooleanField(default=False)
    includes_stems = models.BooleanField(default=False)
    is_exclusive = models.BooleanField(default=False)
    beat_removed_on_purchase = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.name


class BeatTag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self) -> str:
        return self.name


class FeaturedCoverPhoto(models.Model):
    title = models.CharField(max_length=120)
    image = models.FileField(upload_to="beats/featured-covers/")
    checksum = models.CharField(max_length=64, unique=True, blank=True, null=True, editable=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("title", "-created_at")

    def _build_checksum(self) -> str:
        if not self.image:
            return ""
        hasher = hashlib.sha256()
        self.image.open("rb")
        try:
            for chunk in self.image.chunks():
                hasher.update(chunk)
        finally:
            self.image.seek(0)
        return hasher.hexdigest()

    def save(self, *args, **kwargs):
        if self.image:
            self.checksum = self._build_checksum()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


class Beat(models.Model):
    PROTECTION_UNSET = "unset"
    PROTECTION_MONITORED = "monitored"
    PROTECTION_PROTECTED = "protected"
    PROTECTION_CHOICES = (
        (PROTECTION_UNSET, "Unset"),
        (PROTECTION_MONITORED, "Monitored"),
        (PROTECTION_PROTECTED, "Protected"),
    )

    FINGERPRINT_PENDING = "pending"
    FINGERPRINT_READY = "ready"
    FINGERPRINT_FLAGGED = "flagged"
    FINGERPRINT_CHOICES = (
        (FINGERPRINT_PENDING, "Pending"),
        (FINGERPRINT_READY, "Ready"),
        (FINGERPRINT_FLAGGED, "Flagged"),
    )

    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="beats")
    title = models.CharField(max_length=150)
    beat_type = models.CharField(max_length=40, choices=BEAT_TYPE_CHOICES, blank=True)
    genre = models.CharField(max_length=120, choices=GENRE_CHOICES)
    instrument_type = models.CharField(max_length=120, choices=INSTRUMENT_CHOICES, blank=True)
    instrument_types = models.JSONField(default=list, blank=True)
    bpm = models.PositiveIntegerField()
    key = models.CharField(max_length=30, choices=KEY_CHOICES, blank=True)
    mood = models.CharField(max_length=80, choices=MOOD_CHOICES, blank=True)
    mood_types = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commercial_mode = models.CharField(max_length=20, choices=COMMERCIAL_MODE_CHOICES, default="Presets")
    enable_free_mp3_download = models.BooleanField(default=False)
    non_exclusive_wav_enabled = models.BooleanField(default=True)
    non_exclusive_wav_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    non_exclusive_stems_enabled = models.BooleanField(default=False)
    non_exclusive_stems_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    non_exclusive_publishing_rights = models.CharField(max_length=10, choices=PUBLISHING_RIGHTS_CHOICES, blank=True)
    non_exclusive_master_recordings = models.CharField(max_length=20, choices=MASTER_RECORDING_CHOICES, blank=True)
    non_exclusive_license_period = models.CharField(max_length=20, choices=LICENSE_PERIOD_CHOICES, blank=True)
    exclusive_enabled = models.BooleanField(default=False)
    exclusive_license_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    exclusive_publishing_rights = models.CharField(max_length=10, choices=PUBLISHING_RIGHTS_CHOICES, blank=True)
    exclusive_negotiable = models.BooleanField(default=False)
    declaration_accepted = models.BooleanField(default=False)
    protection_status = models.CharField(max_length=20, choices=PROTECTION_CHOICES, default=PROTECTION_UNSET)
    fingerprint_status = models.CharField(max_length=20, choices=FINGERPRINT_CHOICES, default=FINGERPRINT_PENDING)
    proof_of_upload = models.JSONField(default=dict, blank=True)
    abuse_reports_count = models.PositiveIntegerField(default=0)
    audio_file_obj = models.FileField(upload_to="beats/audio/", blank=True, null=True)
    preview_audio_obj = models.FileField(upload_to="beats/preview/", blank=True, null=True)
    stems_file_obj = models.FileField(upload_to="beats/stems/", blank=True, null=True)
    cover_art_obj = models.FileField(upload_to="beats/covers/", blank=True, null=True)
    featured_cover_photo = models.ForeignKey(
        FeaturedCoverPhoto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="beats",
    )
    cover_art = models.URLField(blank=True)
    preview_audio = models.URLField(blank=True)
    audio_file = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    tags = models.ManyToManyField(BeatTag, blank=True, related_name="beats")
    available_licenses = models.ManyToManyField(LicenseType, blank=True, related_name="beats")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.title} ({self.producer.username})"


class BeatUploadDraft(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_PUBLISHED = "published"
    STATUS_CHOICES = (
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
    )

    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="beat_upload_drafts")
    title = models.CharField(max_length=150, blank=True)
    beat_type = models.CharField(max_length=40, choices=BEAT_TYPE_CHOICES, blank=True)
    genre = models.CharField(max_length=120, choices=GENRE_CHOICES, blank=True)
    instrument_type = models.CharField(max_length=120, choices=INSTRUMENT_CHOICES, blank=True)
    instrument_types = models.JSONField(default=list, blank=True)
    bpm = models.PositiveIntegerField(null=True, blank=True)
    key = models.CharField(max_length=30, choices=KEY_CHOICES, blank=True)
    mood = models.CharField(max_length=80, choices=MOOD_CHOICES, blank=True)
    mood_types = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commercial_mode = models.CharField(max_length=20, choices=COMMERCIAL_MODE_CHOICES, default="Presets")
    enable_free_mp3_download = models.BooleanField(default=False)
    non_exclusive_wav_enabled = models.BooleanField(default=True)
    non_exclusive_wav_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    non_exclusive_stems_enabled = models.BooleanField(default=False)
    non_exclusive_stems_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    non_exclusive_publishing_rights = models.CharField(max_length=10, choices=PUBLISHING_RIGHTS_CHOICES, blank=True)
    non_exclusive_master_recordings = models.CharField(max_length=20, choices=MASTER_RECORDING_CHOICES, blank=True)
    non_exclusive_license_period = models.CharField(max_length=20, choices=LICENSE_PERIOD_CHOICES, blank=True)
    exclusive_enabled = models.BooleanField(default=False)
    exclusive_license_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    exclusive_publishing_rights = models.CharField(max_length=10, choices=PUBLISHING_RIGHTS_CHOICES, blank=True)
    exclusive_negotiable = models.BooleanField(default=False)
    declaration_accepted = models.BooleanField(default=False)
    protection_status = models.CharField(max_length=20, choices=Beat.PROTECTION_CHOICES, default=Beat.PROTECTION_MONITORED)
    fingerprint_status = models.CharField(max_length=20, choices=Beat.FINGERPRINT_CHOICES, default=Beat.FINGERPRINT_PENDING)
    proof_of_upload = models.JSONField(default=dict, blank=True)
    abuse_reports_count = models.PositiveIntegerField(default=0)
    selected_license_ids = models.JSONField(default=list, blank=True)
    media = models.JSONField(default=dict, blank=True)
    audio_file_obj = models.FileField(upload_to="beats/drafts/audio/", blank=True, null=True)
    preview_audio_obj = models.FileField(upload_to="beats/drafts/preview/", blank=True, null=True)
    stems_file_obj = models.FileField(upload_to="beats/drafts/stems/", blank=True, null=True)
    cover_art_obj = models.FileField(upload_to="beats/drafts/covers/", blank=True, null=True)
    featured_cover_photo = models.ForeignKey(
        FeaturedCoverPhoto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="drafts",
    )
    current_step = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    published_beat = models.OneToOneField(Beat, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self) -> str:
        return f"Draft<{self.id}> {self.producer.username}"
