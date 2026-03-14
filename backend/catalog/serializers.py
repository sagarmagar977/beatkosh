from rest_framework import serializers

from beats.models import Beat
from catalog.models import BeatTape, BeatTapeTrack, Bundle, BundleItem, SoundKit, SoundKitUploadDraft


class BundleItemSerializer(serializers.ModelSerializer):
    beat_title = serializers.CharField(source="beat.title", read_only=True)

    class Meta:
        model = BundleItem
        fields = ("id", "beat", "beat_title")


class BundleSerializer(serializers.ModelSerializer):
    items = BundleItemSerializer(many=True, read_only=True)
    beat_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Beat.objects.all(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Bundle
        fields = ("id", "producer", "title", "price", "discount", "items", "beat_ids", "created_at")
        read_only_fields = ("producer", "created_at")

    def create(self, validated_data):
        beat_ids = validated_data.pop("beat_ids", [])
        bundle = Bundle.objects.create(**validated_data)
        BundleItem.objects.bulk_create([BundleItem(bundle=bundle, beat=beat) for beat in beat_ids])
        return bundle


class BeatTapeTrackSerializer(serializers.ModelSerializer):
    beat_title = serializers.CharField(source="beat.title", read_only=True)

    class Meta:
        model = BeatTapeTrack
        fields = ("id", "beat", "beat_title", "order")


class BeatTapeSerializer(serializers.ModelSerializer):
    tracks = BeatTapeTrackSerializer(many=True, read_only=True)
    track_items = BeatTapeTrackSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = BeatTape
        fields = (
            "id",
            "producer",
            "title",
            "description",
            "price",
            "tracks",
            "track_items",
            "created_at",
        )
        read_only_fields = ("producer", "created_at")

    def create(self, validated_data):
        track_items = validated_data.pop("track_items", [])
        tape = BeatTape.objects.create(**validated_data)
        BeatTapeTrack.objects.bulk_create(
            [
                BeatTapeTrack(
                    tape=tape,
                    beat=track["beat"],
                    order=track.get("order", idx + 1),
                )
                for idx, track in enumerate(track_items)
            ]
        )
        return tape


class SoundKitSerializer(serializers.ModelSerializer):
    producer_username = serializers.CharField(source="producer.username", read_only=True)
    cover_art_upload = serializers.FileField(source="cover_art_obj", required=False, allow_null=True, write_only=True)
    archive_file_upload = serializers.FileField(
        source="archive_file_obj",
        required=False,
        allow_null=True,
        write_only=True,
    )
    preview_audio_upload = serializers.FileField(
        source="preview_audio_obj",
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = SoundKit
        fields = (
            "id",
            "producer",
            "producer_username",
            "title",
            "kit_type",
            "description",
            "genre",
            "mood",
            "bpm_min",
            "bpm_max",
            "base_price",
            "cover_art_obj",
            "archive_file_obj",
            "preview_audio_obj",
            "cover_art_upload",
            "archive_file_upload",
            "preview_audio_upload",
            "reference_links",
            "tags",
            "is_active",
            "created_at",
        )
        read_only_fields = ("producer", "created_at")


class SoundKitUploadDraftSerializer(serializers.ModelSerializer):
    producer_username = serializers.CharField(source="producer.username", read_only=True)
    cover_art_upload = serializers.FileField(source="cover_art_obj", required=False, allow_null=True, write_only=True)
    archive_file_upload = serializers.FileField(
        source="archive_file_obj",
        required=False,
        allow_null=True,
        write_only=True,
    )
    preview_audio_upload = serializers.FileField(
        source="preview_audio_obj",
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = SoundKitUploadDraft
        fields = (
            "id",
            "producer",
            "producer_username",
            "title",
            "kit_type",
            "description",
            "genre",
            "mood",
            "bpm_min",
            "bpm_max",
            "base_price",
            "reference_links",
            "tags",
            "cover_art_obj",
            "archive_file_obj",
            "preview_audio_obj",
            "cover_art_upload",
            "archive_file_upload",
            "preview_audio_upload",
            "current_step",
            "status",
            "published_sound_kit",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "producer",
            "status",
            "published_sound_kit",
            "created_at",
            "updated_at",
        )
