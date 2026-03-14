from rest_framework import serializers

from beats.models import Beat, BeatTag, BeatUploadDraft, LicenseType


class LicenseTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LicenseType
        fields = (
            "id",
            "name",
            "description",
            "streams_limit",
            "includes_wav",
            "includes_stems",
            "is_exclusive",
            "beat_removed_on_purchase",
        )


class BeatTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = BeatTag
        fields = ("id", "name")


class BeatSerializer(serializers.ModelSerializer):
    producer_username = serializers.CharField(source="producer.username", read_only=True)
    licenses = LicenseTypeSerializer(source="available_licenses", many=True, read_only=True)
    tag_names = serializers.SlugRelatedField(
        source="tags",
        many=True,
        slug_field="name",
        queryset=BeatTag.objects.all(),
        required=False,
    )
    license_ids = serializers.PrimaryKeyRelatedField(
        source="available_licenses",
        many=True,
        queryset=LicenseType.objects.all(),
        required=False,
        write_only=True,
    )
    audio_file_upload = serializers.FileField(source="audio_file_obj", required=False, allow_null=True, write_only=True)
    preview_audio_upload = serializers.FileField(
        source="preview_audio_obj",
        required=False,
        allow_null=True,
        write_only=True,
    )
    stems_file_upload = serializers.FileField(source="stems_file_obj", required=False, allow_null=True, write_only=True)
    cover_art_upload = serializers.FileField(source="cover_art_obj", required=False, allow_null=True, write_only=True)

    class Meta:
        model = Beat
        fields = (
            "id",
            "producer",
            "producer_username",
            "title",
            "beat_type",
            "genre",
            "instrument_type",
            "bpm",
            "key",
            "mood",
            "description",
            "base_price",
            "commercial_mode",
            "enable_free_mp3_download",
            "non_exclusive_wav_enabled",
            "non_exclusive_wav_fee",
            "non_exclusive_stems_enabled",
            "non_exclusive_stems_fee",
            "non_exclusive_publishing_rights",
            "non_exclusive_master_recordings",
            "non_exclusive_license_period",
            "exclusive_enabled",
            "exclusive_license_fee",
            "exclusive_publishing_rights",
            "exclusive_negotiable",
            "declaration_accepted",
            "audio_file_obj",
            "preview_audio_obj",
            "stems_file_obj",
            "cover_art_obj",
            "audio_file_upload",
            "preview_audio_upload",
            "stems_file_upload",
            "cover_art_upload",
            "cover_art",
            "preview_audio",
            "audio_file",
            "is_active",
            "tag_names",
            "licenses",
            "license_ids",
            "created_at",
        )
        read_only_fields = ("producer", "created_at")


class BeatUploadDraftSerializer(serializers.ModelSerializer):
    producer_username = serializers.CharField(source="producer.username", read_only=True)
    audio_file_upload = serializers.FileField(source="audio_file_obj", required=False, allow_null=True, write_only=True)
    preview_audio_upload = serializers.FileField(
        source="preview_audio_obj",
        required=False,
        allow_null=True,
        write_only=True,
    )
    stems_file_upload = serializers.FileField(source="stems_file_obj", required=False, allow_null=True, write_only=True)
    cover_art_upload = serializers.FileField(source="cover_art_obj", required=False, allow_null=True, write_only=True)

    class Meta:
        model = BeatUploadDraft
        fields = (
            "id",
            "producer",
            "producer_username",
            "title",
            "beat_type",
            "genre",
            "instrument_type",
            "bpm",
            "key",
            "mood",
            "description",
            "base_price",
            "commercial_mode",
            "enable_free_mp3_download",
            "non_exclusive_wav_enabled",
            "non_exclusive_wav_fee",
            "non_exclusive_stems_enabled",
            "non_exclusive_stems_fee",
            "non_exclusive_publishing_rights",
            "non_exclusive_master_recordings",
            "non_exclusive_license_period",
            "exclusive_enabled",
            "exclusive_license_fee",
            "exclusive_publishing_rights",
            "exclusive_negotiable",
            "declaration_accepted",
            "selected_license_ids",
            "media",
            "audio_file_obj",
            "preview_audio_obj",
            "stems_file_obj",
            "cover_art_obj",
            "audio_file_upload",
            "preview_audio_upload",
            "stems_file_upload",
            "cover_art_upload",
            "current_step",
            "status",
            "published_beat",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "producer",
            "status",
            "published_beat",
            "created_at",
            "updated_at",
            "audio_file_obj",
            "preview_audio_obj",
            "stems_file_obj",
            "cover_art_obj",
        )
