from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import BeatTape, Bundle, SoundKit, SoundKitUploadDraft
from catalog.serializers import BeatTapeSerializer, BundleSerializer, SoundKitSerializer, SoundKitUploadDraftSerializer
from common.permissions import IsProducerOrReadOnly


class BundleListCreateView(generics.ListCreateAPIView):
    queryset = Bundle.objects.prefetch_related("items__beat")
    serializer_class = BundleSerializer
    permission_classes = [IsProducerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(producer=self.request.user)


class BundleDetailView(generics.RetrieveAPIView):
    queryset = Bundle.objects.prefetch_related("items__beat")
    serializer_class = BundleSerializer


class BeatTapeListCreateView(generics.ListCreateAPIView):
    queryset = BeatTape.objects.prefetch_related("tracks__beat")
    serializer_class = BeatTapeSerializer
    permission_classes = [IsProducerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(producer=self.request.user)


class BeatTapeDetailView(generics.RetrieveAPIView):
    queryset = BeatTape.objects.prefetch_related("tracks__beat")
    serializer_class = BeatTapeSerializer


class SoundKitListCreateView(generics.ListCreateAPIView):
    queryset = SoundKit.objects.select_related("producer")
    serializer_class = SoundKitSerializer
    permission_classes = [IsProducerOrReadOnly]
    parser_classes = (JSONParser, MultiPartParser, FormParser)

    def perform_create(self, serializer):
        serializer.save(producer=self.request.user)


class SoundKitDetailView(generics.RetrieveAPIView):
    queryset = SoundKit.objects.select_related("producer")
    serializer_class = SoundKitSerializer


class SoundKitUploadDraftListCreateView(generics.ListCreateAPIView):
    serializer_class = SoundKitUploadDraftSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (JSONParser, MultiPartParser, FormParser)

    def get_queryset(self):
        return SoundKitUploadDraft.objects.filter(producer=self.request.user)

    def perform_create(self, serializer):
        if not self.request.user.is_producer or self.request.user.active_role != "producer":
            raise PermissionDenied("Switch to producer mode to create sound kit drafts.")
        serializer.save(producer=self.request.user)


class SoundKitUploadDraftDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SoundKitUploadDraftSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (JSONParser, MultiPartParser, FormParser)

    def get_queryset(self):
        return SoundKitUploadDraft.objects.filter(producer=self.request.user)


class SoundKitUploadDraftPublishView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, draft_id: int):
        draft = SoundKitUploadDraft.objects.filter(id=draft_id, producer=request.user).first()
        if not draft:
            raise PermissionDenied("Draft not found for current producer.")
        if not request.user.is_producer or request.user.active_role != "producer":
            raise PermissionDenied("Switch to producer mode to publish sound kits.")
        if draft.status == SoundKitUploadDraft.STATUS_PUBLISHED and draft.published_sound_kit_id:
            return Response(SoundKitSerializer(draft.published_sound_kit).data, status=status.HTTP_200_OK)
        if not all([draft.title, draft.kit_type, draft.base_price]):
            return Response(
                {"detail": "Draft is incomplete. title, kit_type, and base_price are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sound_kit = SoundKit.objects.create(
            producer=request.user,
            title=draft.title,
            kit_type=draft.kit_type,
            description=draft.description,
            genre=draft.genre,
            mood=draft.mood,
            bpm_min=draft.bpm_min,
            bpm_max=draft.bpm_max,
            base_price=draft.base_price,
            cover_art_obj=draft.cover_art_obj,
            archive_file_obj=draft.archive_file_obj,
            preview_audio_obj=draft.preview_audio_obj,
            reference_links=draft.reference_links,
            tags=draft.tags,
            is_active=True,
        )
        draft.status = SoundKitUploadDraft.STATUS_PUBLISHED
        draft.published_sound_kit = sound_kit
        draft.current_step = max(draft.current_step, 4)
        draft.save(update_fields=["status", "published_sound_kit", "current_step", "updated_at"])
        return Response(SoundKitSerializer(sound_kit).data, status=status.HTTP_201_CREATED)
