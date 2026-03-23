from rest_framework import serializers

from projects.models import Deliverable, Milestone, Project, ProjectRequest, Proposal


class ProjectRequestSerializer(serializers.ModelSerializer):
    workflow_label = serializers.SerializerMethodField()
    instrument_types = serializers.ListField(child=serializers.CharField(max_length=120), required=False)
    mood_types = serializers.ListField(child=serializers.CharField(max_length=80), required=False)
    producer_username = serializers.CharField(source="producer.username", read_only=True)

    class Meta:
        model = ProjectRequest
        fields = (
            "id",
            "artist",
            "producer",
            "producer_username",
            "title",
            "description",
            "project_type",
            "expected_track_count",
            "preferred_genre",
            "instrument_types",
            "mood_types",
            "target_genre_style",
            "reference_links",
            "delivery_timeline_days",
            "revision_allowance",
            "budget",
            "offer_price",
            "status",
            "workflow_label",
            "created_at",
        )
        read_only_fields = ("artist", "status", "created_at")
        extra_kwargs = {"producer": {"required": False, "allow_null": True}}

    def validate_producer(self, value):
        if value is None:
            return value
        if not value.is_producer:
            raise serializers.ValidationError("Selected user is not a producer.")
        return value

    def validate_instrument_types(self, value):
        cleaned = []
        for item in value:
            name = item.strip()
            if name and name not in cleaned:
                cleaned.append(name)
        return cleaned

    def validate_mood_types(self, value):
        cleaned = []
        for item in value:
            name = item.strip()
            if name and name not in cleaned:
                cleaned.append(name)
        return cleaned

    def get_workflow_label(self, obj):
        return "Brief submitted" if obj.status == ProjectRequest.STATUS_PENDING else obj.get_status_display()


class ProposalSerializer(serializers.ModelSerializer):
    producer_username = serializers.CharField(source="producer.username", read_only=True)

    class Meta:
        model = Proposal
        fields = ("id", "project_request", "producer", "producer_username", "amount", "message", "created_at")
        read_only_fields = ("producer", "created_at")


class DeliverableSerializer(serializers.ModelSerializer):
    submitted_by_username = serializers.CharField(source="submitted_by.username", read_only=True)

    class Meta:
        model = Deliverable
        fields = (
            "id",
            "milestone",
            "submitted_by",
            "submitted_by_username",
            "note",
            "file_url",
            "version_label",
            "status",
            "created_at",
        )
        read_only_fields = ("submitted_by", "created_at")


class MilestoneSerializer(serializers.ModelSerializer):
    deliverables = DeliverableSerializer(many=True, read_only=True)

    class Meta:
        model = Milestone
        fields = ("id", "project", "title", "description", "amount", "due_date", "status", "deliverables")


class ProjectSerializer(serializers.ModelSerializer):
    artist_username = serializers.CharField(source="artist.username", read_only=True)
    producer_username = serializers.CharField(source="producer.username", read_only=True)
    milestones = MilestoneSerializer(many=True, read_only=True)
    workflow_summary = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "id",
            "artist",
            "artist_username",
            "producer",
            "producer_username",
            "title",
            "description",
            "project_type",
            "expected_track_count",
            "preferred_genre",
            "instrument_types",
            "mood_types",
            "target_genre_style",
            "reference_links",
            "delivery_timeline_days",
            "revision_allowance",
            "linked_conversation_hint",
            "budget",
            "offer_price",
            "status",
            "workflow_stage",
            "workflow_summary",
            "milestones",
            "created_at",
        )

    def get_workflow_summary(self, obj):
        milestones = list(obj.milestones.all())
        deliverable_count = sum(m.deliverables.count() for m in milestones)
        return {
            "milestone_count": len(milestones),
            "deliverable_count": deliverable_count,
            "funded_milestones": sum(1 for item in milestones if item.status in {Milestone.STATUS_FUNDED, Milestone.STATUS_IN_PROGRESS, Milestone.STATUS_DELIVERED, Milestone.STATUS_IN_REVIEW, Milestone.STATUS_APPROVED}),
            "approved_milestones": sum(1 for item in milestones if item.status == Milestone.STATUS_APPROVED),
            "stage_label": obj.get_workflow_stage_display(),
        }
