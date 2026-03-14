from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.views import (
    ArtistProfileMeView,
    BeatLikeView,
    FollowProducerView,
    MeView,
    MyBeatLikesListView,
    MyFollowingListView,
    ProducerDetailView,
    ProducerDetailByUserView,
    ProducerProfileMeView,
    RegisterView,
    StartSellingView,
    SwitchRoleView,
)

def both(route: str, view, name: str):
    route = route.strip("/")
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]


urlpatterns = [
    *both("register", RegisterView.as_view(), "register"),
    *both("login", TokenObtainPairView.as_view(), "login"),
    *both("token/refresh", TokenRefreshView.as_view(), "token-refresh"),
    *both("me", MeView.as_view(), "me"),
    *both("artist-profile", ArtistProfileMeView.as_view(), "artist-profile-me"),
    *both("producer-profile", ProducerProfileMeView.as_view(), "producer-profile-me"),
    *both("switch-role", SwitchRoleView.as_view(), "switch-role"),
    *both("start-selling", StartSellingView.as_view(), "start-selling"),
    *both("producers/<int:pk>", ProducerDetailView.as_view(), "producer-detail"),
    *both("producers/by-user/<int:user_id>", ProducerDetailByUserView.as_view(), "producer-detail-by-user"),
    *both("follows/me", MyFollowingListView.as_view(), "follows-me"),
    *both("follows/producers/<int:producer_id>", FollowProducerView.as_view(), "follow-producer"),
    *both("likes/beats/me", MyBeatLikesListView.as_view(), "beat-likes-me"),
    *both("likes/beats/<int:beat_id>", BeatLikeView.as_view(), "beat-like"),
]
