import json

from django.db.models import Sum
from rest_framework import serializers

from beats.metadata_choices import INSTRUMENT_VALUES, MOOD_VALUES
from beats.models import Beat, BeatTag, BeatUploadDraft, FeaturedCoverPhoto, LicenseType


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


class FeaturedCoverPhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = FeaturedCoverPhoto
        fields = ("id", "title", "image", "image_url", "is_active", "created_at")

    def get_image_url(self, obj):
        return obj.image.url if obj.image else ""


class InstrumentTypesField(serializers.ListField):
    child = serializers.ChoiceField(choices=INSTRUMENT_VALUES)

    def get_value(self, dictionary):
        if hasattr(dictionary, "getlist"):
            values = dictionary.getlist(self.field_name)
            if values:
                if len(values) == 1 and isinstance(values[0], str):
                    raw = values[0].strip()
                    if raw.startswith("["):
                        try:
                            return json.loads(raw)
                        except json.JSONDecodeError:
                            pass
                return values
        value = dictionary.get(self.field_name, serializers.empty)
        if isinstance(value, str):
            raw = value.strip()
            if raw.startswith("["):
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    return value
        return value


class InstrumentTypesSerializerMixin:
    instrument_types = InstrumentTypesField(required=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instrument_types = attrs.get("instrument_types")
        instrument_type = attrs.get("instrument_type")

        if instrument_types is not None:
            cleaned = []
            for item in instrument_types:
                if item not in cleaned:
                    cleaned.append(item)
            attrs["instrument_types"] = cleaned
            attrs["instrument_type"] = cleaned[0] if cleaned else ""
        elif instrument_type is not None:
            attrs["instrument_types"] = [instrument_type] if instrument_type else []

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get("instrument_types"):
            data["instrument_types"] = [instance.instrument_type] if instance.instrument_type else []
        return data


class MoodTypesField(serializers.ListField):
    child = serializers.ChoiceField(choices=MOOD_VALUES)

    def get_value(self, dictionary):
        if hasattr(dictionary, "getlist"):
            values = dictionary.getlist(self.field_name)
            if values:
                if len(values) == 1 and isinstance(values[0], str):
                    raw = values[0].strip()
                    if raw.startswith("["):
                        try:
                            return json.loads(raw)
                        except json.JSONDecodeError:
                            pass
                return values
        value = dictionary.get(self.field_name, serializers.empty)
        if isinstance(value, str):
            raw = value.strip()
            if raw.startswith("["):
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    return value
        return value


class MoodTypesSerializerMixin:
    mood_types = MoodTypesField(required=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        mood_types = attrs.get("mood_types")
        mood = attrs.get("mood")

        if mood_types is not None:
            cleaned = []
            for item in mood_types:
                if item not in cleaned:
                    cleaned.append(item)
            attrs["mood_types"] = cleaned
            attrs["mood"] = cleaned[0] if cleaned else ""
        elif mood is not None:
            attrs["mood_types"] = [mood] if mood else []

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get("mood_types"):
            data["mood_types"] = [instance.mood] if instance.mood else []
        return data


class BeatSerializer(MoodTypesSerializerMixin, InstrumentTypesSerializerMixin, serializers.ModelSerializer):
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
    featured_cover_photo_id = serializers.PrimaryKeyRelatedField(
        source="featured_cover_photo",
        queryset=FeaturedCoverPhoto.objects.filter(is_active=True),
        required=False,
        allow_null=True,
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
    like_count = serializers.SerializerMethodField()
    play_count = serializers.SerializerMethodField()
    is_featured = serializers.SerializerMethodField()
    storefront_flags = serializers.SerializerMethodField()

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
            "instrument_types",
            "bpm",
            "key",
            "mood",
            "mood_types",
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
            "protection_status",
            "fingerprint_status",
            "proof_of_upload",
            "abuse_reports_count",
            "audio_file_obj",
            "preview_audio_obj",
            "stems_file_obj",
            "cover_art_obj",
            "featured_cover_photo",
            "featured_cover_photo_id",
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
            "like_count",
            "play_count",
            "is_featured",
            "storefront_flags",
            "created_at",
        )
        read_only_fields = ("producer", "created_at")

    def get_like_count(self, obj):
        cache = getattr(obj, "_prefetched_objects_cache", {})
        if "likes" in cache:
            return len(cache["likes"])
        return obj.likes.count()

    def get_play_count(self, obj):
        aggregate = obj.listening_events.aggregate(total=Sum("play_count"))
        return aggregate["total"] or 0

    def get_is_featured(self, obj):
        profile = getattr(obj.producer, "producer_profile", None)
        featured_ids = profile.featured_beat_ids if profile and isinstance(profile.featured_beat_ids, list) else []
        return obj.id in featured_ids

    def get_storefront_flags(self, obj):
        licenses = list(obj.available_licenses.all())
        return {
            "free_download": obj.enable_free_mp3_download,
            "stems_available": obj.non_exclusive_stems_enabled or any(license.includes_stems for license in licenses),
            "exclusive_available": obj.exclusive_enabled or any(license.is_exclusive for license in licenses),
            "wav_available": obj.non_exclusive_wav_enabled or any(license.includes_wav for license in licenses),
        }

    def create(self, validated_data):
        featured_cover_photo = validated_data.get("featured_cover_photo")
        beat = super().create(validated_data)
        if featured_cover_photo and not beat.cover_art_obj:
            beat.cover_art_obj = featured_cover_photo.image.name
            beat.save(update_fields=["cover_art_obj"])
        return beat

    def update(self, instance, validated_data):
        beat = super().update(instance, validated_data)
        if beat.featured_cover_photo and not beat.cover_art_obj:
            beat.cover_art_obj = beat.featured_cover_photo.image.name
            beat.save(update_fields=["cover_art_obj"])
        return beat


class BeatUploadDraftSerializer(MoodTypesSerializerMixin, InstrumentTypesSerializerMixin, serializers.ModelSerializer):
    producer_username = serializers.CharField(source="producer.username", read_only=True)
    featured_cover_photo_id = serializers.PrimaryKeyRelatedField(
        source="featured_cover_photo",
        queryset=FeaturedCoverPhoto.objects.filter(is_active=True),
        required=False,
        allow_null=True,
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
        model = BeatUploadDraft
        fields = (
            "id",
            "producer",
            "producer_username",
            "title",
            "beat_type",
            "genre",
            "instrument_type",
            "instrument_types",
            "bpm",
            "key",
            "mood",
            "mood_types",
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
            "protection_status",
            "fingerprint_status",
            "proof_of_upload",
            "abuse_reports_count",
            "selected_license_ids",
            "media",
            "audio_file_obj",
            "preview_audio_obj",
            "stems_file_obj",
            "cover_art_obj",
            "featured_cover_photo",
            "featured_cover_photo_id",
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

    def update(self, instance, validated_data):
        draft = super().update(instance, validated_data)
        if draft.featured_cover_photo and not draft.cover_art_obj:
            draft.cover_art_obj = draft.featured_cover_photo.image.name
            draft.save(update_fields=["cover_art_obj"])
        return draft
