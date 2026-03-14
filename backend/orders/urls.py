from django.urls import path

from orders.views import DownloadBeatHQUrlView, DownloadLibraryView, OrderCreateView, OrderDetailView, OrderHistoryView

def both(route: str, view, name: str):
    route = route.strip("/")
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]

urlpatterns = [
    *both("create", OrderCreateView.as_view(), "order-create"),
    *both("history", OrderHistoryView.as_view(), "order-history"),
    *both("downloads", DownloadLibraryView.as_view(), "order-download-library"),
    *both("downloads/<int:beat_id>/hq-url", DownloadBeatHQUrlView.as_view(), "order-download-hq-url"),
    *both("<int:pk>", OrderDetailView.as_view(), "order-detail"),
]
