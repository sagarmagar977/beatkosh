from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied

from projects.models import Deliverable, Milestone, Project, ProjectRequest, Proposal
from projects.serializers import (
    DeliverableSerializer,
    MilestoneSerializer,
    ProjectRequestSerializer,
    ProjectSerializer,
    ProposalSerializer,
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
        if req.producer_id != self.request.user.id:
            raise PermissionDenied("Only the requested producer can submit a proposal.")

        proposal = serializer.save(producer=self.request.user)
        req = proposal.project_request
        if req.status == ProjectRequest.STATUS_PENDING:
            req.status = ProjectRequest.STATUS_ACCEPTED
            req.save(update_fields=["status"])
            Project.objects.get_or_create(
                artist=req.artist,
                producer=req.producer,
                title=req.title,
                defaults={"description": req.description, "budget": req.budget},
            )


class ProjectListView(generics.ListAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Project.objects.filter(Q(artist=user) | Q(producer=user)).order_by("-created_at")


class MilestoneCreateView(generics.CreateAPIView):
    serializer_class = MilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if self.request.user.id != project.artist_id:
            raise PermissionDenied("Only the project artist can add milestones.")
        serializer.save()


class MilestoneStatusUpdateView(generics.UpdateAPIView):
    serializer_class = MilestoneSerializer
    queryset = Milestone.objects.select_related("project")
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch"]

    def perform_update(self, serializer):
        milestone = self.get_object()
        if self.request.user.id not in (milestone.project.artist_id, milestone.project.producer_id):
            raise PermissionDenied("Only project participants can update milestone.")
        serializer.save()


class DeliverableCreateView(generics.CreateAPIView):
    serializer_class = DeliverableSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        milestone = serializer.validated_data["milestone"]
        if self.request.user.id != milestone.project.producer_id:
            raise PermissionDenied("Only project producer can submit deliverables.")
        serializer.save(submitted_by=self.request.user)


class ProjectMilestoneListView(generics.ListAPIView):
    serializer_class = MilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project = Project.objects.get(id=self.kwargs["project_id"])
        if self.request.user.id not in (project.artist_id, project.producer_id):
            raise PermissionDenied("Only project participants can view milestones.")
        return project.milestones.all()


class MilestoneDeliverableListView(generics.ListAPIView):
    serializer_class = DeliverableSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        milestone = Milestone.objects.select_related("project").get(id=self.kwargs["milestone_id"])
        if self.request.user.id not in (milestone.project.artist_id, milestone.project.producer_id):
            raise PermissionDenied("Only project participants can view deliverables.")
        return Deliverable.objects.filter(milestone=milestone)

