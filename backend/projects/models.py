from django.db import models

from accounts.models import User


class ProjectRequest(models.Model):
    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_REJECTED, "Rejected"),
    )

    artist = models.ForeignKey(User, on_delete=models.CASCADE, related_name="project_requests_sent")
    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="project_requests_received")
    title = models.CharField(max_length=150)
    description = models.TextField()
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)


class Proposal(models.Model):
    project_request = models.ForeignKey(ProjectRequest, on_delete=models.CASCADE, related_name="proposals")
    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="proposals")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Project(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
    )

    artist = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projects_as_artist")
    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projects_as_producer")
    title = models.CharField(max_length=150)
    description = models.TextField()
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)


class Milestone(models.Model):
    STATUS_PENDING = "pending"
    STATUS_FUNDED = "funded"
    STATUS_DELIVERED = "delivered"
    STATUS_APPROVED = "approved"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_FUNDED, "Funded"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_APPROVED, "Approved"),
    )

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="milestones")
    title = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)


class Deliverable(models.Model):
    milestone = models.ForeignKey(Milestone, on_delete=models.CASCADE, related_name="deliverables")
    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="deliverables")
    note = models.TextField(blank=True)
    file_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

# Create your models here.
