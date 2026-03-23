from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics_app.models import ActivityDrop
from beats.media_processing import generate_stream_preview_for_beat, generate_stream_preview_for_draft
from beats.metadata_choices import (
    BEAT_TYPE_VALUES,
    COMMERCIAL_MODE_VALUES,
    GENRE_VALUES,
    INSTRUMENT_VALUES,
    KEY_VALUES,
    LICENSE_PERIOD_VALUES,
    MASTER_RECORDING_VALUES,
    MOOD_VALUES,
    PUBLISHING_RIGHTS_VALUES,
)
from beats.models import Beat, BeatTag, BeatTrendSnapshot, BeatUploadDraft, FeaturedCoverPhoto, LicenseType
from beats.serializers import (
    BeatSerializer,
    BeatTrendSnapshotSerializer,
    BeatUploadDraftSerializer,
    FeaturedCoverPhotoSerializer,
    LicenseTypeSerializer,
)
from beats.services.trending import TREND_LIMIT
from common.permissions import IsProducerOrReadOnly


def _resolve_default_license_types(draft: BeatUploadDraft):
    licenses = []
    if draft.non_exclusive_wav_enabled:
        wav_license, _ = LicenseType.objects.get_or_create(
            name="WAV",
            defaults={
                "includes_wav": True,
                "includes_stems": False,
                "is_exclusive": False,
            },
        )
        licenses.append(wav_license)
    if draft.non_exclusive_stems_enabled:
        stems_license, _ = LicenseType.objects.get_or_create(
            name="WAV + STEMS",
            defaults={
                "includes_wav": True,
                "includes_stems": True,
                "is_exclusive": False,
            },
        )
        licenses.append(stems_license)
    if draft.exclusive_enabled:
        exclusive_license, _ = LicenseType.objects.get_or_create(
            name="EXCLUSIVE",
            defaults={
                "includes_wav": True,
                "includes_stems": bool(draft.non_exclusive_stems_enabled),
                "is_exclusive": True,
                "beat_removed_on_purchase": True,
            },
        )
        licenses.append(exclusive_license)
    return licenses


class BeatListCreateView(generics.ListCreateAPIView):
    queryset = Beat.objects.select_related("producer", "producer__producer_profile", "featured_cover_photo").prefetch_related(
        "tags", "available_licenses", "likes"
    )
    serializer_class = BeatSerializer
    permission_classes = [IsProducerOrReadOnly]

    def get_queryset(self):
        queryset = self.queryset.filter(is_active=True)
        producer_id = self.request.query_params.get("producer")
        genre = self.request.query_params.get("genre")
        if producer_id:
            queryset = queryset.filter(producer_id=producer_id)
        if genre:
            queryset = queryset.filter(genre__iexact=genre)
        return queryset

    def perform_create(self, serializer):
        if self.request.user.active_role != "producer":
            raise PermissionDenied("Switch to producer mode to upload beats.")
        beat = serializer.save(producer=self.request.user)
        try:
            generate_stream_preview_for_beat(beat)
        except Exception:
            pass
        if self.request.user.is_producer:
            ActivityDrop.objects.create(
                producer=self.request.user,
                beat=beat,
                message=f"New beat drop: {beat.title}",
            )


class BeatDetailView(generics.RetrieveAPIView):
    queryset = Beat.objects.select_related("producer", "producer__producer_profile", "featured_cover_photo").prefetch_related(
        "tags", "available_licenses", "likes"
    )
    serializer_class = BeatSerializer


class BaseTrendingBeatsView(generics.ListAPIView):
    serializer_class = BeatTrendSnapshotSerializer
    permission_classes = [permissions.AllowAny]
    period = BeatTrendSnapshot.PERIOD_WEEKLY

    def get_queryset(self):
        return (
            BeatTrendSnapshot.objects.filter(period=self.period, beat__is_active=True)
            .select_related("beat", "beat__producer")
            .only(
                "beat_id",
                "period",
                "rank",
                "score",
                "plays",
                "likes",
                "purchases",
                "calculated_at",
                "beat__id",
                "beat__title",
                "beat__producer_id",
                "beat__producer__username",
                "beat__genre",
                "beat__bpm",
                "beat__base_price",
                "beat__cover_art_obj",
                "beat__preview_audio_obj",
                "beat__created_at",
            )
            .order_by("rank", "-score")[:TREND_LIMIT]
        )


class TrendingBeatsView(BaseTrendingBeatsView):
    period = BeatTrendSnapshot.PERIOD_WEEKLY


class DailyTrendingBeatsView(BaseTrendingBeatsView):
    period = BeatTrendSnapshot.PERIOD_DAILY


class WeeklyTrendingBeatsView(BaseTrendingBeatsView):
    period = BeatTrendSnapshot.PERIOD_WEEKLY


class FeaturedCoverPhotoListView(generics.ListAPIView):
    queryset = FeaturedCoverPhoto.objects.filter(is_active=True)
    serializer_class = FeaturedCoverPhotoSerializer
    permission_classes = [permissions.AllowAny]


class LicenseTypeListCreateView(generics.ListCreateAPIView):
    queryset = LicenseType.objects.all()
    serializer_class = LicenseTypeSerializer
    permission_classes = [IsProducerOrReadOnly]


class BeatUploadView(BeatListCreateView):
    parser_classes = (MultiPartParser, FormParser)


class BeatUploadDraftListCreateView(generics.ListCreateAPIView):
    serializer_class = BeatUploadDraftSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BeatUploadDraft.objects.filter(producer=self.request.user)

    def perform_create(self, serializer):
        if not self.request.user.is_producer:
            raise PermissionDenied("Only producers can create upload drafts.")
        if self.request.user.active_role != "producer":
            raise PermissionDenied("Switch to producer mode to create upload drafts.")
        serializer.save(producer=self.request.user)


class BeatUploadDraftDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BeatUploadDraftSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        return BeatUploadDraft.objects.filter(producer=self.request.user)

    def perform_update(self, serializer):
        draft = serializer.save()
        try:
            generate_stream_preview_for_draft(draft)
        except Exception:
            pass


class BeatUploadDraftPublishView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, draft_id: int):
        draft = BeatUploadDraft.objects.filter(id=draft_id, producer=request.user).first()
        if not draft:
            raise PermissionDenied("Draft not found for current producer.")
        if draft.status == BeatUploadDraft.STATUS_PUBLISHED and draft.published_beat_id:
            return Response(BeatSerializer(draft.published_beat).data, status=status.HTTP_200_OK)
        if not request.user.is_producer:
            raise PermissionDenied("Only producers can publish drafts.")
        if request.user.active_role != "producer":
            raise PermissionDenied("Switch to producer mode to publish.")
        if not all([draft.title, draft.genre, draft.bpm, draft.base_price]):
            return Response(
                {"detail": "Draft is incomplete. title, genre, bpm, and base_price are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        beat = Beat.objects.create(
            producer=request.user,
            title=draft.title,
            beat_type=draft.beat_type,
            genre=draft.genre,
            instrument_type=draft.instrument_type,
            instrument_types=draft.instrument_types,
            bpm=draft.bpm,
            key=draft.key,
            mood=draft.mood,
            mood_types=draft.mood_types,
            description=draft.description,
            base_price=draft.base_price,
            commercial_mode=draft.commercial_mode,
            enable_free_mp3_download=draft.enable_free_mp3_download,
            non_exclusive_wav_enabled=draft.non_exclusive_wav_enabled,
            non_exclusive_wav_fee=draft.non_exclusive_wav_fee,
            non_exclusive_stems_enabled=draft.non_exclusive_stems_enabled,
            non_exclusive_stems_fee=draft.non_exclusive_stems_fee,
            non_exclusive_publishing_rights=draft.non_exclusive_publishing_rights,
            non_exclusive_master_recordings=draft.non_exclusive_master_recordings,
            non_exclusive_license_period=draft.non_exclusive_license_period,
            exclusive_enabled=draft.exclusive_enabled,
            exclusive_license_fee=draft.exclusive_license_fee,
            exclusive_publishing_rights=draft.exclusive_publishing_rights,
            exclusive_negotiable=draft.exclusive_negotiable,
            declaration_accepted=draft.declaration_accepted,
            protection_status=draft.protection_status,
            fingerprint_status=draft.fingerprint_status,
            proof_of_upload=draft.proof_of_upload,
            abuse_reports_count=draft.abuse_reports_count,
            audio_file_obj=draft.audio_file_obj,
            preview_audio_obj=draft.preview_audio_obj,
            stems_file_obj=draft.stems_file_obj,
            cover_art_obj=draft.cover_art_obj,
            featured_cover_photo=draft.featured_cover_photo,
            featured_producer_ids=draft.featured_producer_ids,
        )
        if not beat.cover_art_obj and beat.featured_cover_photo:
            beat.cover_art_obj = beat.featured_cover_photo.image.name
            beat.save(update_fields=["cover_art_obj"])
        if not beat.preview_audio_obj and beat.audio_file_obj:
            try:
                generate_stream_preview_for_beat(beat)
            except Exception:
                pass
        if draft.selected_license_ids:
            licenses = LicenseType.objects.filter(id__in=draft.selected_license_ids)
            beat.available_licenses.set(licenses)
        else:
            beat.available_licenses.set(_resolve_default_license_types(draft))

        draft_media = draft.media if isinstance(draft.media, dict) else {}
        raw_tags = draft_media.get("tags", []) if isinstance(draft_media, dict) else []
        if isinstance(raw_tags, list):
            cleaned_tags = []
            for value in raw_tags:
                if isinstance(value, str):
                    name = value.strip()
                    if name and name not in cleaned_tags:
                        cleaned_tags.append(name)
            if cleaned_tags:
                beat.tags.set([BeatTag.objects.get_or_create(name=name)[0] for name in cleaned_tags])

        draft.status = BeatUploadDraft.STATUS_PUBLISHED
        draft.published_beat = beat
        draft.current_step = max(draft.current_step, 4)
        draft.save(update_fields=["status", "published_beat", "current_step", "updated_at"])
        ActivityDrop.objects.create(
            producer=request.user,
            beat=beat,
            message=f"New beat drop: {beat.title}",
        )
        return Response(BeatSerializer(beat).data, status=status.HTTP_201_CREATED)


class BeatMetadataOptionsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "beat_types": BEAT_TYPE_VALUES,
                "genres": GENRE_VALUES,
                "instrument_types": INSTRUMENT_VALUES,
                "moods": MOOD_VALUES,
                "keys": KEY_VALUES,
                "commercial_modes": COMMERCIAL_MODE_VALUES,
                "publishing_rights": PUBLISHING_RIGHTS_VALUES,
                "master_recordings": MASTER_RECORDING_VALUES,
                "license_periods": LICENSE_PERIOD_VALUES,
            }
        )
