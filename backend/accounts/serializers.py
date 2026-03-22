from django.contrib.auth import get_user_model
from rest_framework import serializers

from accounts.models import ArtistProfile, BeatLike, ProducerFollow, ProducerProfile, ProducerSellerAgreement, UserNotification
from beats.models import Beat
from beats.serializers import BeatSerializer

User = get_user_model()


class ArtistProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArtistProfile
        fields = ("stage_name", "bio", "genres", "social_links", "verified")
        read_only_fields = ("verified",)


class ProducerProfileSerializer(serializers.ModelSerializer):
    avatar_upload = serializers.FileField(source="avatar_obj", required=False, allow_null=True, write_only=True)

    class Meta:
        model = ProducerProfile
        fields = (
            "producer_name",
            "avatar_obj",
            "avatar_upload",
            "headline",
            "bio",
            "genres",
            "experience_years",
            "portfolio_links",
            "service_offerings",
            "featured_beat_ids",
            "accepts_custom_singles",
            "accepts_album_projects",
            "onboarding_notes",
            "verified",
            "rating",
            "total_sales",
        )
        read_only_fields = ("verified", "rating", "total_sales")


class UserMeSerializer(serializers.ModelSerializer):
    artist_profile = ArtistProfileSerializer(read_only=True)
    producer_profile = ProducerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "is_artist",
            "is_producer",
            "active_role",
            "artist_profile",
            "producer_profile",
        )


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("username", "email", "password")

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(
            password=password,
            is_artist=True,
            is_producer=False,
            active_role=User.ROLE_ARTIST,
            **validated_data,
        )
        ArtistProfile.objects.get_or_create(user=user)
        return user


class SwitchRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES)

    def validate_role(self, value):
        user = self.context["request"].user
        if value == User.ROLE_ARTIST and not user.is_artist:
            raise serializers.ValidationError("User does not have artist role.")
        if value == User.ROLE_PRODUCER and not user.is_producer:
            raise serializers.ValidationError("User does not have producer role.")
        return value


class ProducerFollowSerializer(serializers.ModelSerializer):
    artist_username = serializers.CharField(source="artist.username", read_only=True)
    producer_username = serializers.CharField(source="producer.username", read_only=True)

    class Meta:
        model = ProducerFollow
        fields = ("id", "artist", "artist_username", "producer", "producer_username", "created_at")
        read_only_fields = ("artist", "created_at")


class FeaturedProducerCandidateSerializer(serializers.Serializer):
    producer_id = serializers.IntegerField()
    username = serializers.CharField()
    producer_name = serializers.CharField()
    headline = serializers.CharField(allow_blank=True)
    avatar_obj = serializers.CharField(allow_null=True)
    relation = serializers.ChoiceField(choices=("mutual", "following", "follows_you"))


class BeatLikeSerializer(serializers.ModelSerializer):
    beat = BeatSerializer(read_only=True)

    class Meta:
        model = BeatLike
        fields = ("id", "user", "beat", "created_at")
        read_only_fields = ("user", "created_at")


class UserNotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)
    beat_id = serializers.IntegerField(source="beat.id", read_only=True, allow_null=True)
    beat_title = serializers.CharField(source="beat.title", read_only=True, allow_null=True)

    class Meta:
        model = UserNotification
        fields = (
            "id",
            "notification_type",
            "message",
            "is_read",
            "created_at",
            "actor_username",
            "beat_id",
            "beat_title",
        )
        read_only_fields = fields


class ProducerSellerAgreementSerializer(serializers.ModelSerializer):
    accepted = serializers.SerializerMethodField()

    class Meta:
        model = ProducerSellerAgreement
        fields = ("accepted", "accepted_version", "accepted_at")
        read_only_fields = ("accepted", "accepted_at")

    def get_accepted(self, obj):
        return bool(obj and obj.accepted_at)


class ProducerTrustSummarySerializer(serializers.Serializer):
    producer_id = serializers.IntegerField()
    producer_name = serializers.CharField()
    verified = serializers.BooleanField()
    seller_agreement_accepted = serializers.BooleanField()
    payout_ready = serializers.BooleanField()
    profile_completion = serializers.IntegerField()
    trust_score = serializers.IntegerField()
    badges = serializers.ListField(child=serializers.CharField())
    featured_beats = BeatSerializer(many=True)
    service_offerings = serializers.ListField(child=serializers.CharField())
    availability = serializers.DictField(child=serializers.BooleanField())


class ProducerOnboardingStatusSerializer(serializers.Serializer):
    producer_id = serializers.IntegerField()
    checklist = serializers.ListField(child=serializers.DictField())
    progress_percent = serializers.IntegerField()
    trust_summary = ProducerTrustSummarySerializer()


class ProducerDiscoveryCardSerializer(serializers.ModelSerializer):
    producer_id = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    verified = serializers.BooleanField()
    trust_score = serializers.IntegerField(required=False)
    badges = serializers.ListField(child=serializers.CharField(), required=False)
    featured_beats = serializers.SerializerMethodField()

    class Meta:
        model = ProducerProfile
        fields = (
            "producer_id",
            "username",
            "producer_name",
            "headline",
            "genres",
            "verified",
            "rating",
            "total_sales",
            "accepts_custom_singles",
            "accepts_album_projects",
            "service_offerings",
            "trust_score",
            "badges",
            "featured_beats",
        )

    def get_producer_id(self, obj):
        if isinstance(obj, dict):
            return obj.get("producer_id")
        return obj.user_id

    def get_username(self, obj):
        if isinstance(obj, dict):
            return obj.get("username", "")
        return obj.user.username

    def get_featured_beats(self, obj):
        if isinstance(obj, dict):
            return obj.get("featured_beats", [])
        beat_ids = obj.featured_beat_ids[:3] if isinstance(obj.featured_beat_ids, list) else []
        beats = Beat.objects.filter(id__in=beat_ids, producer=obj.user).select_related("producer").prefetch_related("available_licenses")
        return BeatSerializer(beats, many=True).data
