from django.db.models import Prefetch, Q
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from beats.metadata_choices import GENRE_VALUES, INSTRUMENT_VALUES, MOOD_VALUES
from accounts.models import User, UserNotification
from messaging.models import Conversation
from projects.models import Deliverable, Milestone, Project, ProjectRequest, Proposal
from projects.serializers import (
    DeliverableSerializer,
    MilestoneSerializer,
    ProducerProposalSerializer,
    ProjectRequestSerializer,
    ProjectSerializer,
    ProposalSerializer,
)


def _build_project_lookup(briefs):
    keys = {
        (brief.artist_id, brief.producer_id, brief.title)
        for brief in briefs
        if brief.status == ProjectRequest.STATUS_ACCEPTED and brief.producer_id
    }
    if not keys:
        return {}

    projects = (
        Project.objects.filter(
            artist_id__in={key[0] for key in keys},
            producer_id__in={key[1] for key in keys},
            title__in={key[2] for key in keys},
        )
        .select_related("artist", "artist__artist_profile", "producer")
        .prefetch_related("conversations")
        .order_by("-created_at")
    )
    project_lookup = {}
    for project in projects:
        key = (project.artist_id, project.producer_id, project.title)
        project_lookup.setdefault(key, project)
    return project_lookup


def _build_conversation_lookup(projects):
    lookup = {}
    for project in projects:
        prefetched = getattr(project, "_prefetched_objects_cache", {}).get("conversations")
        if prefetched is None:
            conversation = Conversation.objects.filter(project=project).order_by("id").first()
            if conversation:
                lookup[project.id] = conversation.id
            continue
        if prefetched:
            lookup[project.id] = prefetched[0].id
    return lookup


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
        serializer.save(artist=self.request.user, status=ProjectRequest.STATUS_PENDING)


class ProjectRequestDraftCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        producer = None
        producer_id = request.data.get("producer")
        if producer_id:
            try:
                producer = User.objects.get(id=producer_id, is_producer=True)
            except User.DoesNotExist as exc:
                raise ValidationError({"producer": "Selected user is not a producer."}) from exc

        draft = ProjectRequest.objects.create(
            artist=request.user,
            producer=producer,
            title=(request.data.get("title") or "Untitled draft")[:150],
            description=request.data.get("description") or "",
            project_type=request.data.get("project_type") or ProjectRequest.TYPE_CUSTOM_SINGLE,
            expected_track_count=max(1, int(request.data.get("expected_track_count") or 1)),
            preferred_genre=request.data.get("preferred_genre") or "",
            instrument_types=request.data.get("instrument_types") or [],
            mood_types=request.data.get("mood_types") or [],
            target_genre_style=request.data.get("target_genre_style") or "",
            reference_links=request.data.get("reference_links") or [],
            delivery_timeline_days=request.data.get("delivery_timeline_days") or None,
            revision_allowance=int(request.data.get("revision_allowance") or 0),
            budget=request.data.get("budget") or "0.00",
            offer_price=request.data.get("offer_price") or request.data.get("budget") or "0.00",
            status=ProjectRequest.STATUS_DRAFT,
        )
        return Response(ProjectRequestSerializer(draft).data, status=status.HTTP_201_CREATED)


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


class ProducerProposalListView(generics.ListAPIView):
    serializer_class = ProducerProposalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_producer:
            raise PermissionDenied("Only producers can view submitted applications.")
        return (
            Proposal.objects.filter(producer=user)
            .select_related(
                "producer",
                "project_request",
                "project_request__artist",
                "project_request__artist__artist_profile",
                "project_request__producer",
            )
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        proposals = list(page if page is not None else queryset)
        project_lookup = _build_project_lookup([proposal.project_request for proposal in proposals])
        conversation_lookup = _build_conversation_lookup(project_lookup.values())
        serializer = self.get_serializer(
            proposals,
            many=True,
            context={
                **self.get_serializer_context(),
                "project_lookup": project_lookup,
                "conversation_lookup": conversation_lookup,
            },
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class ProjectRequestListView(generics.ListAPIView):
    serializer_class = ProjectRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        project_type = self.request.query_params.get("project_type", "").strip()

        if user.active_role == "producer":
            queryset = ProjectRequest.objects.filter(status=ProjectRequest.STATUS_PENDING)
            queryset = queryset.filter(Q(producer__isnull=True) | Q(producer=user))
        else:
            queryset = ProjectRequest.objects.filter(artist=user)

        if project_type:
            queryset = queryset.filter(project_type=project_type)

        return queryset.select_related("artist", "artist__artist_profile", "producer", "producer__producer_profile").prefetch_related(
            Prefetch(
                "proposals",
                queryset=Proposal.objects.select_related("producer", "project_request").order_by("-created_at"),
            )
        ).order_by("-created_at")


    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        briefs = list(page if page is not None else queryset)
        project_lookup = _build_project_lookup(briefs)
        conversation_lookup = _build_conversation_lookup(project_lookup.values())
        serializer = self.get_serializer(
            briefs,
            many=True,
            context={
                **self.get_serializer_context(),
                "project_lookup": project_lookup,
                "conversation_lookup": conversation_lookup,
            },
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


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

        conversation, _ = Conversation.objects.get_or_create(project=project)
        conversation.participants.set([brief.artist, proposal.producer])

        UserNotification.objects.create(
            user=proposal.producer,
            actor=request.user,
            notification_type=UserNotification.TYPE_PROJECT_PROPOSAL_ACCEPTED,
            message=f"{request.user.username} accepted your offer for {brief.title}.",
        )

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
            .select_related("artist", "artist__artist_profile", "producer")
            .prefetch_related("milestones", "milestones__deliverables", "conversations")
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        projects = list(page if page is not None else queryset)
        serializer = self.get_serializer(
            projects,
            many=True,
            context={
                **self.get_serializer_context(),
                "conversation_lookup": _build_conversation_lookup(projects),
            },
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


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
