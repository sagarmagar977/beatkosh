from django.db import models

from accounts.models import User


class VerificationRequest(models.Model):
    TYPE_ARTIST = "artist"
    TYPE_PRODUCER = "producer"
    TYPE_CHOICES = (
        (TYPE_ARTIST, "Artist"),
        (TYPE_PRODUCER, "Producer"),
    )

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="verification_requests")
    verification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    submitted_documents = models.JSONField(default=list, blank=True)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verification_approvals",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

# Create your models here.
