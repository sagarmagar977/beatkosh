from django.urls import path

from catalog.views import (
    BeatTapeDetailView,
    BeatTapeListCreateView,
    BundleDetailView,
    BundleListCreateView,
    SoundKitDetailView,
    SoundKitListCreateView,
    SoundKitUploadDraftDetailView,
    SoundKitUploadDraftListCreateView,
    SoundKitUploadDraftPublishView,
)

def both(route: str, view, name: str):
    route = route.strip("/")
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]

urlpatterns = [
    *both("bundles", BundleListCreateView.as_view(), "bundle-list-create"),
    *both("bundles/<int:pk>", BundleDetailView.as_view(), "bundle-detail"),
    *both("tapes", BeatTapeListCreateView.as_view(), "tape-list-create"),
    *both("tapes/<int:pk>", BeatTapeDetailView.as_view(), "tape-detail"),
    *both("soundkits", SoundKitListCreateView.as_view(), "soundkit-list-create"),
    *both("soundkits/<int:pk>", SoundKitDetailView.as_view(), "soundkit-detail"),
    *both("soundkits/upload-drafts", SoundKitUploadDraftListCreateView.as_view(), "soundkit-upload-draft-list-create"),
    *both("soundkits/upload-drafts/<int:pk>", SoundKitUploadDraftDetailView.as_view(), "soundkit-upload-draft-detail"),
    *both(
        "soundkits/upload-drafts/<int:draft_id>/publish",
        SoundKitUploadDraftPublishView.as_view(),
        "soundkit-upload-draft-publish",
    ),
]
