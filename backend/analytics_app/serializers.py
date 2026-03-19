from rest_framework import serializers

from accounts.serializers import ProducerDiscoveryCardSerializer
from beats.serializers import BeatSerializer

from analytics_app.models import ActivityDrop, ListeningHistory


class PlayBeatSerializer(serializers.Serializer):
    beat_id = serializers.IntegerField(min_value=1)


class ListeningHistorySerializer(serializers.ModelSerializer):
    beat = BeatSerializer(read_only=True)

    class Meta:
        model = ListeningHistory
        fields = ("id", "beat", "play_count", "last_played_at")


class ActivityDropSerializer(serializers.ModelSerializer):
    producer_username = serializers.CharField(source="producer.username", read_only=True)
    beat = BeatSerializer(read_only=True)

    class Meta:
        model = ActivityDrop
        fields = ("id", "producer", "producer_username", "beat", "message", "created_at")
        read_only_fields = ("producer", "created_at")


class CreateActivityDropSerializer(serializers.Serializer):
    beat_id = serializers.IntegerField(required=False, min_value=1)
    message = serializers.CharField(required=False, allow_blank=True, max_length=280)


class RecommendationFeedSerializer(serializers.Serializer):
    based_on = serializers.CharField()
    beats = BeatSerializer(many=True)


class ProducerDashboardSummarySerializer(serializers.Serializer):
    producer_id = serializers.IntegerField()
    follower_count = serializers.IntegerField()
    verified = serializers.BooleanField()
    plays = serializers.IntegerField()
    likes = serializers.IntegerField()
    purchases = serializers.IntegerField()
    conversion_rate = serializers.FloatField()
    skip_events = serializers.IntegerField()
    activity_drop_count = serializers.IntegerField()
    hiring_inquiry_count = serializers.IntegerField()
    top_beats = BeatSerializer(many=True)
    audience_fit_producers = ProducerDiscoveryCardSerializer(many=True)
