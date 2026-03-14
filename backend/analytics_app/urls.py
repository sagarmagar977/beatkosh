from django.urls import path

from analytics_app.views import (
    ActivityDropCreateView,
    ActivityFeedView,
    ListeningRecentView,
    PlayBeatEventView,
    ProducerAnalyticsView,
)

def both(route: str, view, name: str):
    route = route.strip("/")
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]

urlpatterns = [
    *both("producer/<int:producer_id>", ProducerAnalyticsView.as_view(), "producer-analytics"),
    *both("listening/recent", ListeningRecentView.as_view(), "listening-recent"),
    *both("listening/play", PlayBeatEventView.as_view(), "listening-play"),
    *both("drops/feed", ActivityFeedView.as_view(), "drops-feed"),
    *both("drops/create", ActivityDropCreateView.as_view(), "drops-create"),
]
