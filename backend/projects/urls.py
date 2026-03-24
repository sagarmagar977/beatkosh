from django.urls import path

from projects.views import (
    DeliverableCreateView,
    MilestoneDeliverableListView,
    MilestoneCreateView,
    MilestoneStatusUpdateView,
    ProjectListView,
    ProjectMetadataOptionsView,
    ProjectMilestoneListView,
    ProjectProposalAcceptView,
    ProjectProposalCreateView,
    ProjectRequestCreateView,
    ProjectRequestDraftCreateView,
    ProjectRequestListView,
)


def both(route: str, view, name: str):
    route = route.strip("/")
    if not route:
        return [path("", view, name=name)]
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]


urlpatterns = [
    *both("metadata-options", ProjectMetadataOptionsView.as_view(), "project-metadata-options"),
    *both("requests", ProjectRequestListView.as_view(), "project-request-list"),
    *both("request/draft", ProjectRequestDraftCreateView.as_view(), "project-request-draft-create"),
    *both("request", ProjectRequestCreateView.as_view(), "project-request-create"),
    *both("proposal", ProjectProposalCreateView.as_view(), "project-proposal-create"),
    *both("proposal/<int:pk>/accept", ProjectProposalAcceptView.as_view(), "project-proposal-accept"),
    *both("", ProjectListView.as_view(), "project-list"),
    *both("milestones", MilestoneCreateView.as_view(), "milestone-create"),
    *both("milestones/<int:pk>/status", MilestoneStatusUpdateView.as_view(), "milestone-status-update"),
    *both("milestones/<int:milestone_id>/deliverables", MilestoneDeliverableListView.as_view(), "deliverable-list"),
    *both("deliverables", DeliverableCreateView.as_view(), "deliverable-create"),
    *both("<int:project_id>/milestones", ProjectMilestoneListView.as_view(), "project-milestones"),
]
