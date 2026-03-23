from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from beats.metadata_choices import GENRE_VALUES, INSTRUMENT_VALUES, MOOD_VALUES
from projects.models import Deliverable, Milestone, Project, ProjectRequest, Proposal
from projects.serializers import (
    DeliverableSerializer,
    MilestoneSerializer,
    ProjectRequestSerializer,
    ProjectSerializer,
    ProposalSerializer,
)


class ProjectMetadataOptionsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "project_types": [
                    {
                        "value": ProjectRequest.TYPE_CUSTOM_SINGLE,
                        "label": "Single Production",
                        "description": "Full custom track production from scratch.",
                        "accent": "violet",
                        "base_price": "3000.00",
                    },
                    {
                        "value": ProjectRequest.TYPE_EP,
                        "label": "EP Production",
                        "description": "Multi-track cohesion and creative direction.",
                        "accent": "rose",
                        "base_price": "8500.00",
                    },
                    {
                        "value": ProjectRequest.TYPE_ALBUM,
                        "label": "Album Production",
                        "description": "Long-form production for a complete release.",
                        "accent": "indigo",
                        "base_price": "3000.00",
                    },
                    {
                        "value": ProjectRequest.TYPE_MIX_MASTER,
                        "label": "Post-Production",
                        "description": "Mixing, mastering, and vocal polishing.",
                        "accent": "amber",
                        "base_price": "2500.00",
                    },
                    {
                        "value": ProjectRequest.TYPE_SOUND_DESIGN,
                        "label": "Soundkit Production",
                        "description": "Custom samples, loops, and sound design packs.",
                        "accent": "emerald",
                        "base_price": "2200.00",
                    },
                ],
                "genres": GENRE_VALUES,
                "instrument_types": INSTRUMENT_VALUES,
                "moods": MOOD_VALUES,
                "negotiation": {
                    "bulk_discount_threshold": 10,
                    "bulk_discount_factor": "0.90",
                    "max_negotiation_discount_factor": "0.80",
                },
            }
        )


class ProjectRequestCreateView(generics.CreateAPIView):
    serializer_class = ProjectRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(artist=self.request.user)


class ProjectProposalCreateView(generics.CreateAPIView):
    serializer_class = ProposalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        req = serializer.validated_data["project_request"]
        if not self.request.user.is_producer:
            raise PermissionDenied("Only producers can submit proposals.")
        if req.artist_id == self.request.user.id:
            raise PermissionDenied("Artists cannot submit proposals to their own brief.")
        if req.status != ProjectRequest.STATUS_PENDING:
            raise ValidationError("This hiring brief is no longer accepting proposals.")
        if req.producer_id and req.producer_id != self.request.user.id:
            raise PermissionDenied("Only the requested producer can submit a proposal for this brief.")

        serializer.save(producer=self.request.user)


class ProjectProposalAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        proposal = Proposal.objects.select_related("project_request", "producer", "project_request__artist").get(pk=pk)
        brief = proposal.project_request

        if request.user.id != brief.artist_id:
            raise PermissionDenied("Only the artist who created the brief can accept a proposal.")
        if brief.status != ProjectRequest.STATUS_PENDING:
            raise ValidationError("This hiring brief already has an accepted proposal.")

        brief.status = ProjectRequest.STATUS_ACCEPTED
        brief.producer = proposal.producer
        brief.offer_price = proposal.amount
        brief.save(update_fields=["status", "producer", "offer_price"])

        project, created = Project.objects.get_or_create(
            artist=brief.artist,
            producer=proposal.producer,
            title=brief.title,
            defaults={
                "description": brief.description,
                "project_type": brief.project_type,
                "expected_track_count": brief.expected_track_count,
                "preferred_genre": brief.preferred_genre,
                "instrument_types": brief.instrument_types,
                "mood_types": brief.mood_types,
                "target_genre_style": brief.target_genre_style,
                "reference_links": brief.reference_links,
                "delivery_timeline_days": brief.delivery_timeline_days,
                "revision_allowance": brief.revision_allowance,
                "linked_conversation_hint": f"Discuss revisions for {brief.title} in shared chat",
                "budget": brief.budget,
                "offer_price": proposal.amount,
                "workflow_stage": Project.WORKFLOW_PROPOSAL_ACCEPTED,
            },
        )
        if not created:
            project.offer_price = proposal.amount
            project.workflow_stage = Project.WORKFLOW_PROPOSAL_ACCEPTED
            project.save(update_fields=["offer_price", "workflow_stage"])

        return Response(
            {
                "proposal": ProposalSerializer(proposal).data,
                "project": ProjectSerializer(project).data,
                "project_request": ProjectRequestSerializer(brief).data,
            },
            status=status.HTTP_200_OK,
        )


class ProjectListView(generics.ListAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Project.objects.filter(Q(artist=user) | Q(producer=user))
            .select_related("artist", "producer")
            .prefetch_related("milestones", "milestones__deliverables")
            .order_by("-created_at")
        )


class MilestoneCreateView(generics.CreateAPIView):
    serializer_class = MilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if self.request.user.id != project.artist_id:
            raise PermissionDenied("Only the project artist can add milestones.")
        milestone = serializer.save()
        if project.workflow_stage in {Project.WORKFLOW_BRIEF_SUBMITTED, Project.WORKFLOW_PROPOSAL_ACCEPTED}:
            project.workflow_stage = Project.WORKFLOW_MILESTONES_FUNDED
            project.save(update_fields=["workflow_stage"])
        return milestone


class MilestoneStatusUpdateView(generics.UpdateAPIView):
    serializer_class = MilestoneSerializer
    queryset = Milestone.objects.select_related("project").prefetch_related("deliverables")
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch"]

    def perform_update(self, serializer):
        milestone = self.get_object()
        if self.request.user.id not in (milestone.project.artist_id, milestone.project.producer_id):
            raise PermissionDenied("Only project participants can update milestone.")
        updated = serializer.save()
        project = updated.project
        if updated.status in {Milestone.STATUS_IN_PROGRESS, Milestone.STATUS_DELIVERED}:
            project.workflow_stage = Project.WORKFLOW_IN_PROGRESS
        elif updated.status == Milestone.STATUS_IN_REVIEW:
            project.workflow_stage = Project.WORKFLOW_DELIVERABLES_REVIEW
        elif updated.status == Milestone.STATUS_APPROVED:
            if project.milestones.exclude(status=Milestone.STATUS_APPROVED).exists():
                project.workflow_stage = Project.WORKFLOW_IN_PROGRESS
            else:
                project.workflow_stage = Project.WORKFLOW_COMPLETED
                project.status = Project.STATUS_COMPLETED
                project.save(update_fields=["workflow_stage", "status"])
                return
        project.save(update_fields=["workflow_stage"])


class DeliverableCreateView(generics.CreateAPIView):
    serializer_class = DeliverableSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        milestone = serializer.validated_data["milestone"]
        if self.request.user.id != milestone.project.producer_id:
            raise PermissionDenied("Only project producer can submit deliverables.")
        serializer.save(submitted_by=self.request.user)
        milestone.status = Milestone.STATUS_IN_REVIEW
        milestone.save(update_fields=["status"])
        milestone.project.workflow_stage = Project.WORKFLOW_DELIVERABLES_REVIEW
        milestone.project.save(update_fields=["workflow_stage"])


class ProjectMilestoneListView(generics.ListAPIView):
    serializer_class = MilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project = Project.objects.get(id=self.kwargs["project_id"])
        if self.request.user.id not in (project.artist_id, project.producer_id):
            raise PermissionDenied("Only project participants can view milestones.")
        return project.milestones.prefetch_related("deliverables").all()


class MilestoneDeliverableListView(generics.ListAPIView):
    serializer_class = DeliverableSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        milestone = Milestone.objects.select_related("project").get(id=self.kwargs["milestone_id"])
        if self.request.user.id not in (milestone.project.artist_id, milestone.project.producer_id):
            raise PermissionDenied("Only project participants can view deliverables.")
        return Deliverable.objects.filter(milestone=milestone).select_related("submitted_by")
