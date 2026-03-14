from django.urls import path

from verification.views import VerificationDecisionView, VerificationMeListView, VerificationRequestCreateView

def both(route: str, view, name: str):
    route = route.strip("/")
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]

urlpatterns = [
    *both("requests", VerificationRequestCreateView.as_view(), "verification-request-create"),
    *both("me", VerificationMeListView.as_view(), "verification-me"),
    *both("requests/<int:request_id>/decision", VerificationDecisionView.as_view(), "verification-decision"),
]
