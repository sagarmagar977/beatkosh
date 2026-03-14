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


class Beat(models.Model):
    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="beats")
    title = models.CharField(max_length=150)
    beat_type = models.CharField(max_length=40, choices=BEAT_TYPE_CHOICES, blank=True)
    genre = models.CharField(max_length=120, choices=GENRE_CHOICES)
    instrument_type = models.CharField(max_length=120, choices=INSTRUMENT_CHOICES, blank=True)
    bpm = models.PositiveIntegerField()
    key = models.CharField(max_length=30, choices=KEY_CHOICES, blank=True)
    mood = models.CharField(max_length=80, choices=MOOD_CHOICES, blank=True)
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
    audio_file_obj = models.FileField(upload_to="beats/audio/", blank=True, null=True)
    preview_audio_obj = models.FileField(upload_to="beats/preview/", blank=True, null=True)
    stems_file_obj = models.FileField(upload_to="beats/stems/", blank=True, null=True)
    cover_art_obj = models.FileField(upload_to="beats/covers/", blank=True, null=True)
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
    bpm = models.PositiveIntegerField(null=True, blank=True)
    key = models.CharField(max_length=30, choices=KEY_CHOICES, blank=True)
    mood = models.CharField(max_length=80, choices=MOOD_CHOICES, blank=True)
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
    selected_license_ids = models.JSONField(default=list, blank=True)
    media = models.JSONField(default=dict, blank=True)
    audio_file_obj = models.FileField(upload_to="beats/drafts/audio/", blank=True, null=True)
    preview_audio_obj = models.FileField(upload_to="beats/drafts/preview/", blank=True, null=True)
    stems_file_obj = models.FileField(upload_to="beats/drafts/stems/", blank=True, null=True)
    cover_art_obj = models.FileField(upload_to="beats/drafts/covers/", blank=True, null=True)
    current_step = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    published_beat = models.OneToOneField(Beat, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self) -> str:
        return f"Draft<{self.id}> {self.producer.username}"

# Create your models here.
