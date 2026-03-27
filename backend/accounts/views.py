from django.conf import settings
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Count, Prefetch, Q, Sum
from django.db.models.functions import Coalesce
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.google_auth import build_unique_username, verify_google_id_token
from accounts.models import ArtistProfile, BeatLike, LibraryListenLater, LibraryPlaylist, LibraryPlaylistItem, ProducerFollow, ProducerProfile, ProducerSellerAgreement, UserNotification
from beats.models import Beat
from common.permissions import ensure_producer_mode
from accounts.serializers import (
    ArtistProfileSerializer,
    BeatLikeSerializer,
    FeaturedProducerCandidateSerializer,
    GoogleAuthSerializer,
    LibraryBeatCollectionsSerializer,
    LibraryPlaylistCreateSerializer,
    LibraryPlaylistSerializer,
    LibraryStateSerializer,
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


def _build_library_payload(user: User):
    listen_later_entries = list(
        LibraryListenLater.objects.filter(user=user)
        .select_related("beat", "beat__producer", "beat__producer__producer_profile")
        .prefetch_related("beat__available_licenses", "beat__likes", "beat__tags")
    )
    listen_later_beats = [entry.beat for entry in listen_later_entries if getattr(entry, "beat", None) and entry.beat.is_active]

    playlists = list(LibraryPlaylist.objects.filter(owner=user).prefetch_related("items__beat__available_licenses", "items__beat__likes", "items__beat__tags", "items__beat__producer__producer_profile"))
    return {
        "listen_later": listen_later_beats,
        "playlists": playlists,
    }


def build_producer_trust_summary(user: User, profile: ProducerProfile | None = None):
    profile = profile or getattr(user, "producer_profile", None)
    if profile is None:
        profile, _ = ProducerProfile.objects.get_or_create(user=user)

    try:
        payout_profile = user.payout_profile
    except ProducerPayoutProfile.DoesNotExist:
        payout_profile = None

    approved_requests = getattr(user, "approved_producer_verifications", None)
    if approved_requests is not None:
        verification_exists = bool(approved_requests)
    else:
        verification_exists = VerificationRequest.objects.filter(
            user=user,
            verification_type=VerificationRequest.TYPE_PRODUCER,
            status=VerificationRequest.STATUS_APPROVED,
        ).exists()

    try:
        agreement = user.seller_agreement
    except ProducerSellerAgreement.DoesNotExist:
        agreement = None

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
    featured_queryset = (
        Beat.objects.filter(producer=user, is_active=True)
        .select_related("producer", "producer__producer_profile")
        .prefetch_related("available_licenses", "likes")
        .annotate(_play_count=Coalesce(Sum("listening_events__play_count"), 0))
    )
    featured_beats = list(featured_queryset.filter(id__in=featured_ids)[:4])
    if not featured_beats:
        featured_beats = list(featured_queryset[:4])

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


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payload = verify_google_id_token(serializer.validated_data["credential"])
        email = str(payload["email"]).strip().lower()
        google_sub = str(payload["sub"]).strip()

        user = User.objects.filter(google_sub=google_sub).first()
        if not user:
            user = User.objects.filter(email__iexact=email).first()

        if user and user.google_sub and user.google_sub != google_sub:
            raise ValidationError("This email is already linked to a different Google account.")

        created = False
        if not user:
            user = User(
                username=build_unique_username(email, str(payload.get("name", "")).strip()),
                email=email,
                first_name=str(payload.get("given_name", "")).strip(),
                last_name=str(payload.get("family_name", "")).strip(),
                is_artist=True,
                is_producer=False,
                active_role=User.ROLE_ARTIST,
                auth_provider=User.AUTH_PROVIDER_GOOGLE,
                google_sub=google_sub,
            )
            user.set_unusable_password()
            user.save()
            created = True
        else:
            update_fields = []
            if not user.google_sub:
                user.google_sub = google_sub
                update_fields.append("google_sub")
            if not user.first_name and payload.get("given_name"):
                user.first_name = str(payload.get("given_name", "")).strip()
                update_fields.append("first_name")
            if not user.last_name and payload.get("family_name"):
                user.last_name = str(payload.get("family_name", "")).strip()
                update_fields.append("last_name")
            if user.auth_provider == User.AUTH_PROVIDER_LOCAL and not user.has_usable_password():
                user.auth_provider = User.AUTH_PROVIDER_GOOGLE
                update_fields.append("auth_provider")
            if update_fields:
                user.save(update_fields=update_fields)

        ArtistProfile.objects.get_or_create(user=user)

        refresh = RefreshToken.for_user(user)
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserMeSerializer(user).data,
                "google_client_id_configured": bool(settings.GOOGLE_OAUTH_CLIENT_ID),
            },
            status=response_status,
        )


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
    parser_classes = (JSONParser, MultiPartParser, FormParser)

    def get_object(self):
        profile, _ = ArtistProfile.objects.get_or_create(user=self.request.user)
        return profile


class ProducerProfileMeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProducerProfileSerializer
    parser_classes = (JSONParser, MultiPartParser, FormParser)

    def get_object(self):
        ensure_producer_mode(self.request.user)
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
        follow, created = ProducerFollow.objects.get_or_create(artist=request.user, producer=producer)
        if created:
            UserNotification.objects.create(
                user=producer,
                actor=request.user,
                notification_type=UserNotification.TYPE_PRODUCER_FOLLOWED,
                message=f"{request.user.username} followed your producer profile.",
            )
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
        ensure_producer_mode(request.user)
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


class NotificationReadDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk: int):
        notification = get_object_or_404(UserNotification, id=pk, user=request.user)
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])
        return Response({"marked_read": True, "id": notification.id}, status=status.HTTP_200_OK)


class ProducerSellerAgreementMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ensure_producer_mode(request.user)
        agreement = ProducerSellerAgreement.objects.filter(producer=request.user).first()
        if agreement:
            return Response(ProducerSellerAgreementSerializer(agreement).data)
        return Response({"accepted": False, "accepted_version": "v1", "accepted_at": None})

    def post(self, request):
        ensure_producer_mode(request.user)
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
        ensure_producer_mode(request.user)
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


class LibraryMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(LibraryStateSerializer(_build_library_payload(request.user)).data)


class LibraryPlaylistCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LibraryPlaylistCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        playlist, _created = LibraryPlaylist.objects.get_or_create(
            owner=request.user,
            name=serializer.validated_data["name"],
        )
        return Response(LibraryPlaylistSerializer(playlist).data, status=status.HTTP_201_CREATED)


class LibraryBeatCollectionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, beat_id: int):
        serializer = LibraryBeatCollectionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        beat = get_object_or_404(Beat, id=beat_id, is_active=True)

        if serializer.validated_data["include_listen_later"]:
            LibraryListenLater.objects.get_or_create(user=request.user, beat=beat)
        else:
            LibraryListenLater.objects.filter(user=request.user, beat=beat).delete()

        desired_ids = {int(value) for value in serializer.validated_data.get("playlist_ids", [])}
        user_playlists = list(LibraryPlaylist.objects.filter(owner=request.user))
        for playlist in user_playlists:
            if playlist.id in desired_ids:
                LibraryPlaylistItem.objects.get_or_create(playlist=playlist, beat=beat)
            else:
                LibraryPlaylistItem.objects.filter(playlist=playlist, beat=beat).delete()

        new_playlist_name = serializer.validated_data.get("new_playlist_name", "")
        if new_playlist_name:
            playlist, _created = LibraryPlaylist.objects.get_or_create(owner=request.user, name=new_playlist_name)
            LibraryPlaylistItem.objects.get_or_create(playlist=playlist, beat=beat)

        return Response(LibraryStateSerializer(_build_library_payload(request.user)).data, status=status.HTTP_200_OK)


class LibraryListenLaterBeatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, beat_id: int):
        beat = get_object_or_404(Beat, id=beat_id, is_active=True)
        LibraryListenLater.objects.get_or_create(user=request.user, beat=beat)
        return Response(LibraryStateSerializer(_build_library_payload(request.user)).data, status=status.HTTP_200_OK)

    def delete(self, request, beat_id: int):
        LibraryListenLater.objects.filter(user=request.user, beat_id=beat_id).delete()
        return Response(LibraryStateSerializer(_build_library_payload(request.user)).data, status=status.HTTP_200_OK)


class LibraryPlaylistBeatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, playlist_id: int, beat_id: int):
        playlist = get_object_or_404(LibraryPlaylist, id=playlist_id, owner=request.user)
        LibraryPlaylistItem.objects.filter(playlist=playlist, beat_id=beat_id).delete()
        return Response(LibraryStateSerializer(_build_library_payload(request.user)).data, status=status.HTTP_200_OK)


class ProducerTrustPublicView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, user_id: int):
        producer = User.objects.select_related("producer_profile", "payout_profile", "seller_agreement").prefetch_related(
            Prefetch(
                "verification_requests",
                queryset=VerificationRequest.objects.filter(
                    verification_type=VerificationRequest.TYPE_PRODUCER,
                    status=VerificationRequest.STATUS_APPROVED,
                ),
                to_attr="approved_producer_verifications",
            )
        ).get(id=user_id, is_producer=True)
        summary = build_producer_trust_summary(producer)
        return Response(ProducerTrustSummarySerializer(summary).data)


class ProducerDiscoveryListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProducerDiscoveryCardSerializer

    def get_queryset(self):
        return (
            ProducerProfile.objects.select_related("user", "user__payout_profile", "user__seller_agreement")
            .prefetch_related(
                Prefetch(
                    "user__verification_requests",
                    queryset=VerificationRequest.objects.filter(
                        verification_type=VerificationRequest.TYPE_PRODUCER,
                        status=VerificationRequest.STATUS_APPROVED,
                    ),
                    to_attr="approved_producer_verifications",
                )
            )
            .annotate(follower_count=Count("user__follower_relations"))
            .filter(user__is_producer=True)
            .order_by("-verified", "-total_sales", "-follower_count", "producer_name")[:8]
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        data = []
        for profile in queryset:
            summary = build_producer_trust_summary(profile.user, profile=profile)
            profile._prefetched_featured_beats = summary["featured_beats"]
            serialized = self.get_serializer(profile).data
            serialized["trust_score"] = summary["trust_score"]
            serialized["badges"] = summary["badges"]
            data.append(serialized)
        return Response(data)
