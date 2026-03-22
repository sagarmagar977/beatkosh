from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ArtistProfile, BeatLike, ProducerFollow, ProducerProfile, ProducerSellerAgreement, UserNotification
from beats.models import Beat
from accounts.serializers import (
    ArtistProfileSerializer,
    BeatLikeSerializer,
    FeaturedProducerCandidateSerializer,
    ProducerDiscoveryCardSerializer,
    ProducerFollowSerializer,
    ProducerOnboardingStatusSerializer,
    ProducerProfileSerializer,
    ProducerSellerAgreementSerializer,
    ProducerTrustSummarySerializer,
    RegisterSerializer,
    SwitchRoleSerializer,
    UserNotificationSerializer,
    UserMeSerializer,
)
from payments.models import ProducerPayoutProfile
from verification.models import VerificationRequest

User = get_user_model()


def _normalize_service_offerings(profile: ProducerProfile):
    offerings = profile.service_offerings if isinstance(profile.service_offerings, list) else []
    return [str(item).strip() for item in offerings if str(item).strip()]



def _build_featured_producer_candidates(user: User):
    sent_ids = set(
        ProducerFollow.objects.filter(artist=user, producer__is_producer=True)
        .exclude(producer=user)
        .values_list("producer_id", flat=True)
    )
    received_ids = set(
        ProducerFollow.objects.filter(producer=user, artist__is_producer=True)
        .exclude(artist=user)
        .values_list("artist_id", flat=True)
    )
    ordered_ids = list(sent_ids.union(received_ids))
    if not ordered_ids:
        return []

    producers = {
        producer.id: producer
        for producer in User.objects.filter(id__in=ordered_ids, is_producer=True).select_related("producer_profile")
    }
    payload = []
    for producer_id in ordered_ids:
        producer = producers.get(producer_id)
        if not producer:
            continue
        profile = getattr(producer, "producer_profile", None)
        relation = "mutual" if producer_id in sent_ids and producer_id in received_ids else ("following" if producer_id in sent_ids else "follows_you")
        payload.append({
            "producer_id": producer.id,
            "username": producer.username,
            "producer_name": (profile.producer_name if profile and profile.producer_name else producer.username),
            "headline": profile.headline if profile else "",
            "avatar_obj": profile.avatar_obj.url if profile and profile.avatar_obj else None,
            "relation": relation,
        })
    relation_rank = {"mutual": 0, "following": 1, "follows_you": 2}
    payload.sort(key=lambda item: (relation_rank[item["relation"]], item["producer_name"].lower()))
    return payload


def build_producer_trust_summary(user: User):
    profile, _ = ProducerProfile.objects.get_or_create(user=user)
    payout_profile = ProducerPayoutProfile.objects.filter(producer=user).first()
    verification_exists = VerificationRequest.objects.filter(
        user=user,
        verification_type=VerificationRequest.TYPE_PRODUCER,
        status=VerificationRequest.STATUS_APPROVED,
    ).exists()
    agreement = ProducerSellerAgreement.objects.filter(producer=user).first()

    profile_checks = [
        bool(profile.producer_name.strip()),
        bool(profile.bio.strip()),
        bool(profile.genres.strip()),
        profile.experience_years > 0,
        bool(_normalize_service_offerings(profile)),
    ]
    profile_completion = int(round((sum(profile_checks) / len(profile_checks)) * 100)) if profile_checks else 0

    payout_ready = bool(
        payout_profile
        and payout_profile.method.strip()
        and payout_profile.account_number.strip()
        and payout_profile.account_holder.strip()
    )

    badges = []
    if profile.verified or verification_exists:
        badges.append("Verified producer")
    if agreement:
        badges.append("Seller agreement on file")
    if payout_ready:
        badges.append("Local payouts ready")
    if profile.accepts_album_projects:
        badges.append("Album-ready")
    if profile.accepts_custom_singles:
        badges.append("Custom singles")
    if profile.total_sales >= 5:
        badges.append("Active seller")

    trust_score = min(
        100,
        profile_completion // 2
        + (20 if profile.verified or verification_exists else 0)
        + (15 if agreement else 0)
        + (15 if payout_ready else 0)
        + min(profile.total_sales, 10),
    )

    featured_ids = profile.featured_beat_ids if isinstance(profile.featured_beat_ids, list) else []
    featured_beats = list(
        Beat.objects.filter(producer=user, is_active=True, id__in=featured_ids)
        .select_related("producer")
        .prefetch_related("available_licenses")[:4]
    )
    if not featured_beats:
        featured_beats = list(
            Beat.objects.filter(producer=user, is_active=True)
            .select_related("producer")
            .prefetch_related("available_licenses")[:4]
        )

    return {
        "producer_id": user.id,
        "producer_name": profile.producer_name or user.username,
        "verified": profile.verified or verification_exists,
        "seller_agreement_accepted": bool(agreement),
        "payout_ready": payout_ready,
        "profile_completion": profile_completion,
        "trust_score": trust_score,
        "badges": badges,
        "featured_beats": featured_beats,
        "service_offerings": _normalize_service_offerings(profile),
        "availability": {
            "custom_single": profile.accepts_custom_singles,
            "album": profile.accepts_album_projects,
        },
    }


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        output = UserMeSerializer(user)
        return Response(output.data, status=status.HTTP_201_CREATED)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserMeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        if user.is_artist:
            ArtistProfile.objects.get_or_create(user=user)
        if user.is_producer:
            ProducerProfile.objects.get_or_create(user=user)
        return user


class SwitchRoleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SwitchRoleSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.active_role = serializer.validated_data["role"]
        request.user.save(update_fields=["active_role"])
        return Response({"active_role": request.user.active_role}, status=status.HTTP_200_OK)


class StartSellingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        update_fields = []
        if not user.is_producer:
            user.is_producer = True
            update_fields.append("is_producer")
        if user.active_role != User.ROLE_PRODUCER:
            user.active_role = User.ROLE_PRODUCER
            update_fields.append("active_role")
        if update_fields:
            user.save(update_fields=update_fields)
        ProducerProfile.objects.get_or_create(user=user)
        return Response(UserMeSerializer(user).data, status=status.HTTP_200_OK)


class ProducerDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = ProducerProfile.objects.select_related("user")
    serializer_class = ProducerProfileSerializer


class ProducerDetailByUserView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProducerProfileSerializer

    def get_object(self):
        profile, _ = ProducerProfile.objects.get_or_create(user_id=self.kwargs["user_id"])
        return profile


class ArtistProfileMeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ArtistProfileSerializer

    def get_object(self):
        profile, _ = ArtistProfile.objects.get_or_create(user=self.request.user)
        return profile


class ProducerProfileMeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProducerProfileSerializer
    parser_classes = (JSONParser, MultiPartParser, FormParser)

    def get_object(self):
        profile, _ = ProducerProfile.objects.get_or_create(user=self.request.user)
        return profile


class FollowProducerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, producer_id: int):
        producer = User.objects.get(id=producer_id)
        if not producer.is_producer:
            raise PermissionDenied("Target user is not a producer.")
        if request.user.id == producer.id:
            raise PermissionDenied("You cannot follow yourself.")
        follow, _ = ProducerFollow.objects.get_or_create(artist=request.user, producer=producer)
        return Response(ProducerFollowSerializer(follow).data, status=status.HTTP_201_CREATED)

    def delete(self, request, producer_id: int):
        ProducerFollow.objects.filter(artist=request.user, producer_id=producer_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyFollowingListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProducerFollowSerializer

    def get_queryset(self):
        return ProducerFollow.objects.filter(artist=self.request.user).select_related("artist", "producer")


class FeaturedProducerCandidatesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_producer:
            raise PermissionDenied("Producer role required.")
        payload = _build_featured_producer_candidates(request.user)
        return Response(FeaturedProducerCandidateSerializer(payload, many=True).data)


class BeatLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, beat_id: int):
        beat = Beat.objects.get(id=beat_id)
        like, created = BeatLike.objects.get_or_create(user=request.user, beat=beat)
        if created and beat.producer_id != request.user.id:
            UserNotification.objects.create(
                user=beat.producer,
                actor=request.user,
                beat=beat,
                notification_type=UserNotification.TYPE_BEAT_LIKED,
                message=f"{request.user.username} liked your beat {beat.title}.",
            )
        return Response(BeatLikeSerializer(like).data, status=status.HTTP_201_CREATED)

    def delete(self, request, beat_id: int):
        BeatLike.objects.filter(user=request.user, beat_id=beat_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyBeatLikesListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BeatLikeSerializer

    def get_queryset(self):
        return BeatLike.objects.filter(user=self.request.user).select_related("beat", "beat__producer")


class MyNotificationsListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserNotificationSerializer

    def get_queryset(self):
        return UserNotification.objects.filter(user=self.request.user).select_related("actor", "beat", "beat__producer")[:20]


class MyNotificationsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        UserNotification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"marked_read": True}, status=status.HTTP_200_OK)


class ProducerSellerAgreementMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        agreement = ProducerSellerAgreement.objects.filter(producer=request.user).first()
        if agreement:
            return Response(ProducerSellerAgreementSerializer(agreement).data)
        return Response({"accepted": False, "accepted_version": "v1", "accepted_at": None})

    def post(self, request):
        if not request.user.is_producer:
            raise PermissionDenied("Producer role required.")
        agreement, _ = ProducerSellerAgreement.objects.get_or_create(
            producer=request.user,
            defaults={
                "accepted_version": request.data.get("accepted_version", "v1"),
                "ip_address": request.META.get("REMOTE_ADDR"),
            },
        )
        if request.data.get("accepted_version") and agreement.accepted_version != request.data["accepted_version"]:
            agreement.accepted_version = request.data["accepted_version"]
            agreement.save(update_fields=["accepted_version"])
        return Response(ProducerSellerAgreementSerializer(agreement).data, status=status.HTTP_200_OK)


class ProducerOnboardingStatusMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_producer:
            raise PermissionDenied("Producer role required.")
        profile, _ = ProducerProfile.objects.get_or_create(user=request.user)
        trust_summary = build_producer_trust_summary(request.user)
        payout_profile = ProducerPayoutProfile.objects.filter(producer=request.user).first()
        verification_pending = VerificationRequest.objects.filter(
            user=request.user,
            verification_type=VerificationRequest.TYPE_PRODUCER,
            status=VerificationRequest.STATUS_PENDING,
        ).exists()
        checklist = [
            {
                "id": "profile",
                "label": "Studio profile completed",
                "done": trust_summary["profile_completion"] >= 60,
                "detail": f"{trust_summary['profile_completion']}% complete",
            },
            {
                "id": "seller_agreement",
                "label": "Seller agreement accepted",
                "done": trust_summary["seller_agreement_accepted"],
                "detail": "Unlocks protected selling status",
            },
            {
                "id": "payouts",
                "label": "Local payout details ready",
                "done": trust_summary["payout_ready"],
                "detail": payout_profile.method if payout_profile and payout_profile.method else "Add bank or wallet details",
            },
            {
                "id": "verification",
                "label": "Verification / KYC",
                "done": trust_summary["verified"],
                "detail": "Under review" if verification_pending else ("Approved" if trust_summary["verified"] else "Not submitted"),
            },
            {
                "id": "services",
                "label": "Service offerings published",
                "done": bool(_normalize_service_offerings(profile)),
                "detail": "Custom single / album production visibility",
            },
        ]
        done_count = sum(1 for item in checklist if item["done"])
        payload = {
            "producer_id": request.user.id,
            "checklist": checklist,
            "progress_percent": int(round((done_count / len(checklist)) * 100)),
            "trust_summary": trust_summary,
        }
        return Response(ProducerOnboardingStatusSerializer(payload).data)


class ProducerTrustPublicView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, user_id: int):
        producer = User.objects.get(id=user_id, is_producer=True)
        summary = build_producer_trust_summary(producer)
        return Response(ProducerTrustSummarySerializer(summary).data)


class ProducerDiscoveryListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProducerDiscoveryCardSerializer

    def get_queryset(self):
        return (
            ProducerProfile.objects.select_related("user")
            .annotate(follower_count=Count("user__follower_relations"))
            .filter(user__is_producer=True)
            .order_by("-verified", "-total_sales", "-follower_count", "producer_name")[:8]
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        data = []
        for profile in queryset:
            summary = build_producer_trust_summary(profile.user)
            serialized = self.get_serializer(profile).data
            serialized["trust_score"] = summary["trust_score"]
            serialized["badges"] = summary["badges"]
            data.append(serialized)
        return Response(data)
