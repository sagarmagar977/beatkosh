from django.contrib.auth import get_user_model
from rest_framework import serializers

from accounts.models import ArtistProfile, BeatLike, ProducerFollow, ProducerProfile
from beats.serializers import BeatSerializer

User = get_user_model()


class ArtistProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArtistProfile
        fields = ("stage_name", "bio", "genres", "social_links", "verified")
        read_only_fields = ("verified",)


class ProducerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProducerProfile
        fields = (
            "producer_name",
            "bio",
            "genres",
            "experience_years",
            "portfolio_links",
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


class BeatLikeSerializer(serializers.ModelSerializer):
    beat = BeatSerializer(read_only=True)

    class Meta:
        model = BeatLike
        fields = ("id", "user", "beat", "created_at")
        read_only_fields = ("user", "created_at")
