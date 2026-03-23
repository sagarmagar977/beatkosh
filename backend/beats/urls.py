from django.urls import path

from beats.views import (
    BeatDetailView,
    BeatListCreateView,
    BeatMetadataOptionsView,
    BeatUploadDraftDetailView,
    BeatUploadDraftListCreateView,
    BeatUploadDraftPublishView,
    BeatUploadView,
    DailyTrendingBeatsView,
    FeaturedCoverPhotoListView,
    LicenseTypeListCreateView,
    TrendingBeatsView,
    WeeklyTrendingBeatsView,
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
    *both("", BeatListCreateView.as_view(), "beat-list-create"),
    *both("upload", BeatUploadView.as_view(), "beat-upload"),
    *both("upload-drafts", BeatUploadDraftListCreateView.as_view(), "beat-upload-draft-list-create"),
    *both("upload-drafts/<int:pk>", BeatUploadDraftDetailView.as_view(), "beat-upload-draft-detail"),
    *both("upload-drafts/<int:draft_id>/publish", BeatUploadDraftPublishView.as_view(), "beat-upload-draft-publish"),
    *both("trending", TrendingBeatsView.as_view(), "beat-trending"),
    *both("trending/daily", DailyTrendingBeatsView.as_view(), "beat-trending-daily"),
    *both("trending/weekly", WeeklyTrendingBeatsView.as_view(), "beat-trending-weekly"),
    *both("featured-covers", FeaturedCoverPhotoListView.as_view(), "featured-cover-photo-list"),
    *both("licenses", LicenseTypeListCreateView.as_view(), "license-list-create"),
    *both("metadata-options", BeatMetadataOptionsView.as_view(), "beat-metadata-options"),
    *both("<int:pk>", BeatDetailView.as_view(), "beat-detail"),
]
