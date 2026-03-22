from django.db import models

from accounts.models import User
from beats.metadata_choices import GENRE_CHOICES


class ProjectRequest(models.Model):
    TYPE_CUSTOM_SINGLE = "custom_single"
    TYPE_EP = "ep"
    TYPE_ALBUM = "album"
    TYPE_MIX_MASTER = "mix_master"
    TYPE_SOUND_DESIGN = "sound_design"
    TYPE_CHOICES = (
        (TYPE_CUSTOM_SINGLE, "Custom Single"),
        (TYPE_EP, "EP"),
        (TYPE_ALBUM, "Album"),
        (TYPE_MIX_MASTER, "Mix & Master"),
        (TYPE_SOUND_DESIGN, "Sound Design"),
    )

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
    project_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default=TYPE_CUSTOM_SINGLE)
    expected_track_count = models.PositiveIntegerField(default=1)
    preferred_genre = models.CharField(max_length=120, choices=GENRE_CHOICES, blank=True)
    instrument_types = models.JSONField(default=list, blank=True)
    mood_types = models.JSONField(default=list, blank=True)
    target_genre_style = models.CharField(max_length=160, blank=True)
    reference_links = models.JSONField(default=list, blank=True)
    delivery_timeline_days = models.PositiveIntegerField(null=True, blank=True)
    revision_allowance = models.PositiveIntegerField(default=0)
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    offer_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
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

    WORKFLOW_BRIEF_SUBMITTED = "brief_submitted"
    WORKFLOW_PROPOSAL_ACCEPTED = "proposal_accepted"
    WORKFLOW_MILESTONES_FUNDED = "milestones_funded"
    WORKFLOW_IN_PROGRESS = "work_in_progress"
    WORKFLOW_DELIVERABLES_REVIEW = "deliverables_review"
    WORKFLOW_COMPLETED = "completed"
    WORKFLOW_CANCELLED = "cancelled"
    WORKFLOW_CHOICES = (
        (WORKFLOW_BRIEF_SUBMITTED, "Brief Submitted"),
        (WORKFLOW_PROPOSAL_ACCEPTED, "Proposal Accepted"),
        (WORKFLOW_MILESTONES_FUNDED, "Milestones Funded"),
        (WORKFLOW_IN_PROGRESS, "Work In Progress"),
        (WORKFLOW_DELIVERABLES_REVIEW, "Deliverables Review"),
        (WORKFLOW_COMPLETED, "Completed"),
        (WORKFLOW_CANCELLED, "Cancelled"),
    )

    artist = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projects_as_artist")
    producer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projects_as_producer")
    title = models.CharField(max_length=150)
    description = models.TextField()
    project_type = models.CharField(max_length=30, choices=ProjectRequest.TYPE_CHOICES, default=ProjectRequest.TYPE_CUSTOM_SINGLE)
    expected_track_count = models.PositiveIntegerField(default=1)
    preferred_genre = models.CharField(max_length=120, choices=GENRE_CHOICES, blank=True)
    instrument_types = models.JSONField(default=list, blank=True)
    mood_types = models.JSONField(default=list, blank=True)
    target_genre_style = models.CharField(max_length=160, blank=True)
    reference_links = models.JSONField(default=list, blank=True)
    delivery_timeline_days = models.PositiveIntegerField(null=True, blank=True)
    revision_allowance = models.PositiveIntegerField(default=0)
    linked_conversation_hint = models.CharField(max_length=160, blank=True)
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    offer_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    workflow_stage = models.CharField(max_length=30, choices=WORKFLOW_CHOICES, default=WORKFLOW_BRIEF_SUBMITTED)
    created_at = models.DateTimeField(auto_now_add=True)


class Milestone(models.Model):
    STATUS_PENDING = "pending"
    STATUS_FUNDED = "funded"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_DELIVERED = "delivered"
    STATUS_IN_REVIEW = "in_review"
    STATUS_APPROVED = "approved"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_FUNDED, "Funded"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_IN_REVIEW, "In Review"),
        (STATUS_APPROVED, "Approved"),
    )

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="milestones")
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)


class Deliverable(models.Model):
    STATUS_SUBMITTED = "submitted"
    STATUS_REVISION_REQUESTED = "revision_requested"
    STATUS_ACCEPTED = "accepted"
    STATUS_CHOICES = (
        (STATUS_SUBMITTED, "Submitted"),
        (STATUS_REVISION_REQUESTED, "Revision Requested"),
        (STATUS_ACCEPTED, "Accepted"),
    )

    milestone = models.ForeignKey(Milestone, on_delete=models.CASCADE, related_name="deliverables")
    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="deliverables")
    note = models.TextField(blank=True)
    file_url = models.URLField(blank=True)
    version_label = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_SUBMITTED)
    created_at = models.DateTimeField(auto_now_add=True)

