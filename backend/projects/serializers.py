from rest_framework import serializers

from projects.models import Deliverable, Milestone, Project, ProjectRequest, Proposal


class ProjectRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectRequest
        fields = ("id", "artist", "producer", "title", "description", "budget", "status", "created_at")
        read_only_fields = ("artist", "status", "created_at")

    def validate_producer(self, value):
        if not value.is_producer:
            raise serializers.ValidationError("Selected user is not a producer.")
        return value


class ProposalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proposal
        fields = ("id", "project_request", "producer", "amount", "message", "created_at")
        read_only_fields = ("producer", "created_at")


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ("id", "artist", "producer", "title", "description", "budget", "status", "created_at")


class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = ("id", "project", "title", "amount", "due_date", "status")


class DeliverableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deliverable
        fields = ("id", "milestone", "submitted_by", "note", "file_url", "created_at")
        read_only_fields = ("submitted_by", "created_at")
