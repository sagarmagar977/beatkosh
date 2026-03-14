from django.urls import path

from common.views import HealthCheckView

def both(route: str, view, name: str):
    route = route.strip("/")
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]

urlpatterns = [
    *both("health", HealthCheckView.as_view(), "health-check"),
]
