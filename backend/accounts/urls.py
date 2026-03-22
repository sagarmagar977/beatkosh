from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.views import (
    ArtistProfileMeView,
    BeatLikeView,
    FeaturedProducerCandidatesView,
    FollowProducerView,
    MeView,
    MyBeatLikesListView,
    MyFollowingListView,
    MyNotificationsListView,
    MyNotificationsReadView,
    ProducerDetailByUserView,
    ProducerDetailView,
    ProducerDiscoveryListView,
    ProducerOnboardingStatusMeView,
    ProducerProfileMeView,
    ProducerSellerAgreementMeView,
    ProducerTrustPublicView,
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
    *both("producer-onboarding/me", ProducerOnboardingStatusMeView.as_view(), "producer-onboarding-me"),
    *both("producer-seller-agreement/me", ProducerSellerAgreementMeView.as_view(), "producer-seller-agreement-me"),
    *both("producer-trust/<int:user_id>", ProducerTrustPublicView.as_view(), "producer-trust-public"),
    *both("producer-discovery", ProducerDiscoveryListView.as_view(), "producer-discovery"),
    *both("switch-role", SwitchRoleView.as_view(), "switch-role"),
    *both("start-selling", StartSellingView.as_view(), "start-selling"),
    *both("producers/<int:pk>", ProducerDetailView.as_view(), "producer-detail"),
    *both("producers/by-user/<int:user_id>", ProducerDetailByUserView.as_view(), "producer-detail-by-user"),
    *both("follows/me", MyFollowingListView.as_view(), "follows-me"),
    *both("featured-producers/candidates", FeaturedProducerCandidatesView.as_view(), "featured-producer-candidates"),
    *both("follows/producers/<int:producer_id>", FollowProducerView.as_view(), "follow-producer"),
    *both("likes/beats/me", MyBeatLikesListView.as_view(), "beat-likes-me"),
    *both("likes/beats/<int:beat_id>", BeatLikeView.as_view(), "beat-like"),
    *both("notifications/me", MyNotificationsListView.as_view(), "notifications-me"),
    *both("notifications/read", MyNotificationsReadView.as_view(), "notifications-read"),
]
