from rest_framework import serializers

from projects.models import Deliverable, Milestone, Project, ProjectRequest, Proposal


class ProposalSerializer(serializers.ModelSerializer):
    producer_username = serializers.CharField(source="producer.username", read_only=True)

    class Meta:
        model = Proposal
        fields = ("id", "project_request", "producer", "producer_username", "amount", "message", "created_at")
        read_only_fields = ("producer", "created_at")


class ProducerProposalSerializer(serializers.ModelSerializer):
    producer_username = serializers.CharField(source="producer.username", read_only=True)
    artist_username = serializers.CharField(source="project_request.artist.username", read_only=True)
    artist_avatar_obj = serializers.SerializerMethodField()
    project_title = serializers.CharField(source="project_request.title", read_only=True)
    project_type = serializers.CharField(source="project_request.project_type", read_only=True)
    project_budget = serializers.CharField(source="project_request.budget", read_only=True)
    brief_status = serializers.CharField(source="project_request.status", read_only=True)
    brief_created_at = serializers.DateTimeField(source="project_request.created_at", read_only=True)
    application_status = serializers.SerializerMethodField()

    class Meta:
        model = Proposal
        fields = (
            "id",
            "project_request",
            "project_title",
            "project_type",
            "project_budget",
            "brief_status",
            "brief_created_at",
            "artist_username",
            "artist_avatar_obj",
            "producer",
            "producer_username",
            "amount",
            "message",
            "application_status",
            "created_at",
        )
        read_only_fields = fields

    def get_artist_avatar_obj(self, obj):
        profile = getattr(obj.project_request.artist, "artist_profile", None)
        if profile and profile.avatar_obj:
            return profile.avatar_obj.url
        return None

    def get_application_status(self, obj):
        brief = obj.project_request
        if brief.status == ProjectRequest.STATUS_ACCEPTED:
            return "accepted" if brief.producer_id == obj.producer_id else "rejected"
        if brief.status == ProjectRequest.STATUS_REJECTED:
            return "rejected"
        return "pending"


class ProjectRequestSerializer(serializers.ModelSerializer):
    workflow_label = serializers.SerializerMethodField()
    instrument_types = serializers.ListField(child=serializers.CharField(max_length=120), required=False)
    mood_types = serializers.ListField(child=serializers.CharField(max_length=80), required=False)
    producer_username = serializers.CharField(source="producer.username", read_only=True)
    artist_username = serializers.CharField(source="artist.username", read_only=True)
    artist_avatar_obj = serializers.SerializerMethodField()
    proposal_count = serializers.SerializerMethodField()
    proposals = serializers.SerializerMethodField()

    class Meta:
        model = ProjectRequest
        fields = (
            "id",
            "artist",
            "artist_username",
            "artist_avatar_obj",
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
            "proposal_count",
            "proposals",
            "created_at",
        )
        read_only_fields = ("artist", "created_at")
        extra_kwargs = {"producer": {"required": False, "allow_null": True}, "status": {"required": False}}

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

    def validate_status(self, value):
        if value not in {ProjectRequest.STATUS_DRAFT, ProjectRequest.STATUS_PENDING, ProjectRequest.STATUS_ACCEPTED, ProjectRequest.STATUS_REJECTED}:
            raise serializers.ValidationError("Invalid request status.")
        return value

    def get_workflow_label(self, obj):
        if obj.status == ProjectRequest.STATUS_DRAFT:
            return "Draft"
        return "Brief submitted" if obj.status == ProjectRequest.STATUS_PENDING else obj.get_status_display()

    def get_artist_avatar_obj(self, obj):
        profile = getattr(obj.artist, "artist_profile", None)
        if profile and profile.avatar_obj:
            return profile.avatar_obj.url
        return None

    def get_proposal_count(self, obj):
        return obj.proposals.count()

    def get_proposals(self, obj):
        proposals = obj.proposals.all().order_by("-created_at")
        return ProposalSerializer(proposals, many=True).data


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
    artist_avatar_obj = serializers.SerializerMethodField()
    producer_username = serializers.CharField(source="producer.username", read_only=True)
    milestones = MilestoneSerializer(many=True, read_only=True)
    workflow_summary = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "id",
            "artist",
            "artist_username",
            "artist_avatar_obj",
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

    def get_artist_avatar_obj(self, obj):
        profile = getattr(obj.artist, "artist_profile", None)
        if profile and profile.avatar_obj:
            return profile.avatar_obj.url
        return None

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
