from django.urls import path

from analytics_app.views import (
    ActivityDropCreateView,
    ActivityFeedView,
    ListeningRecentView,
    PlayBeatEventView,
    ProducerAnalyticsView,
    ProducerDashboardSummaryView,
    RecommendedBeatsView,
    SimilarBeatsView,
    SimilarProducersView,
)


def both(route: str, view, name: str):
    route = route.strip("/")
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]


urlpatterns = [
    *both("producer/<int:producer_id>", ProducerAnalyticsView.as_view(), "producer-analytics"),
    *both("producer/<int:producer_id>/dashboard-summary", ProducerDashboardSummaryView.as_view(), "producer-dashboard-summary"),
    *both("recommendations/beats", RecommendedBeatsView.as_view(), "recommended-beats"),
    *both("similar/beats/<int:beat_id>", SimilarBeatsView.as_view(), "similar-beats"),
    *both("similar/producers/<int:producer_id>", SimilarProducersView.as_view(), "similar-producers"),
    *both("listening/recent", ListeningRecentView.as_view(), "listening-recent"),
    *both("listening/play", PlayBeatEventView.as_view(), "listening-play"),
    *both("drops/feed", ActivityFeedView.as_view(), "drops-feed"),
    *both("drops/create", ActivityDropCreateView.as_view(), "drops-create"),
]
