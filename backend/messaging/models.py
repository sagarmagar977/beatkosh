from django.db import models

from accounts.models import User
from projects.models import Project


class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name="conversations")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="conversations", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="messages_sent")
    content = models.TextField()
    attachments = models.JSONField(default=list, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("timestamp",)

# Create your models here.
