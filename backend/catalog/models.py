from django.db import models

from accounts.models import User
from beats.models import Beat


class Bundle(models.Model):
    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bundles")
    title = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.title


class BundleItem(models.Model):
    bundle = models.ForeignKey(Bundle, on_delete=models.CASCADE, related_name="items")
    beat = models.ForeignKey(Beat, on_delete=models.CASCADE, related_name="bundle_links")

    class Meta:
        unique_together = ("bundle", "beat")


class BeatTape(models.Model):
    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="beat_tapes")
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.title


class BeatTapeTrack(models.Model):
    tape = models.ForeignKey(BeatTape, on_delete=models.CASCADE, related_name="tracks")
    beat = models.ForeignKey(Beat, on_delete=models.CASCADE, related_name="tape_links")
    order = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ("tape", "beat")
        ordering = ("order",)


class SoundKit(models.Model):
    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sound_kits")
    title = models.CharField(max_length=150)
    kit_type = models.CharField(max_length=80, blank=True)
    description = models.TextField(blank=True)
    genre = models.CharField(max_length=80, blank=True)
    mood = models.CharField(max_length=80, blank=True)
    bpm_min = models.PositiveIntegerField(null=True, blank=True)
    bpm_max = models.PositiveIntegerField(null=True, blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cover_art_obj = models.FileField(upload_to="soundkits/covers/", blank=True, null=True)
    archive_file_obj = models.FileField(upload_to="soundkits/archives/", blank=True, null=True)
    preview_audio_obj = models.FileField(upload_to="soundkits/preview/", blank=True, null=True)
    reference_links = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.title


class SoundKitUploadDraft(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_PUBLISHED = "published"
    STATUS_CHOICES = (
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
    )

    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sound_kit_upload_drafts")
    title = models.CharField(max_length=150, blank=True)
    kit_type = models.CharField(max_length=80, blank=True)
    description = models.TextField(blank=True)
    genre = models.CharField(max_length=80, blank=True)
    mood = models.CharField(max_length=80, blank=True)
    bpm_min = models.PositiveIntegerField(null=True, blank=True)
    bpm_max = models.PositiveIntegerField(null=True, blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reference_links = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    cover_art_obj = models.FileField(upload_to="soundkits/drafts/covers/", blank=True, null=True)
    archive_file_obj = models.FileField(upload_to="soundkits/drafts/archives/", blank=True, null=True)
    preview_audio_obj = models.FileField(upload_to="soundkits/drafts/preview/", blank=True, null=True)
    current_step = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    published_sound_kit = models.OneToOneField(SoundKit, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self) -> str:
        return f"SoundKitDraft<{self.id}> {self.producer.username}"

# Create your models here.
