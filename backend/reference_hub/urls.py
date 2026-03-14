from django.urls import path

from reference_hub.views import Beat22ReferenceImageView, Beat22ReferenceSummaryView


def both(route: str, view, name: str):
    route = route.strip("/")
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]


urlpatterns = [
    *both("beat22", Beat22ReferenceSummaryView.as_view(), "beat22-reference-summary"),
    *both("beat22/<str:role>/<str:slug>/image", Beat22ReferenceImageView.as_view(), "beat22-reference-image"),
]
