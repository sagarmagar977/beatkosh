from django.db import models

from accounts.models import User
from projects.models import Project


class Review(models.Model):
    artist = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews_given")
    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews_received")
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviews")
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("artist", "producer", "project")

# Create your models here.
