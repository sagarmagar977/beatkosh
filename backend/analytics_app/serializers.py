from rest_framework import serializers

from accounts.serializers import LibraryPlaylistSerializer, ProducerDiscoveryCardSerializer
from beats.serializers import BeatSerializer

from analytics_app.models import ActivityDrop, ListeningHistory, ListeningSession, UserTasteProfile


class PlayBeatSerializer(serializers.Serializer):
    beat_id = serializers.IntegerField(min_value=1)
    source = serializers.CharField(required=False, allow_blank=True, max_length=80)


class ListeningSessionStartSerializer(serializers.Serializer):
    beat_id = serializers.IntegerField(min_value=1)
    source = serializers.CharField(required=False, allow_blank=True, max_length=80)
    resume = serializers.BooleanField(required=False, default=False)


class ListeningSessionFinishSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(min_value=1)
    listened_seconds = serializers.IntegerField(min_value=0)
    duration_seconds = serializers.IntegerField(min_value=0, required=False)
    end_reason = serializers.ChoiceField(choices=ListeningSession.END_REASON_CHOICES, required=False)


class ListeningHistorySerializer(serializers.ModelSerializer):
    beat = BeatSerializer(read_only=True)

    class Meta:
        model = ListeningHistory
        fields = ("id", "beat", "play_count", "last_played_at")


class ListeningSessionSerializer(serializers.ModelSerializer):
    beat = BeatSerializer(read_only=True)

    class Meta:
        model = ListeningSession
        fields = (
            "id",
            "beat",
            "source",
            "started_at",
            "last_event_at",
            "listened_seconds",
            "duration_seconds",
            "completion_percent",
            "is_completed",
            "is_skipped",
            "end_reason",
        )


class UserTasteProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserTasteProfile
        fields = (
            "favorite_genres",
            "favorite_moods",
            "favorite_instruments",
            "favorite_producer_ids",
            "liked_genres",
            "bpm_min",
            "bpm_max",
            "bpm_average",
            "today_snapshot",
            "updated_at",
        )


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


class AnalyticsSeriesPointSerializer(serializers.Serializer):
    label = serializers.CharField()
    plays = serializers.IntegerField(required=False)
    sales = serializers.IntegerField(required=False)
    revenue = serializers.FloatField(required=False)


class AnalyticsRangeSerializer(serializers.Serializer):
    key = serializers.CharField()
    days = serializers.IntegerField()
    start = serializers.DateField()
    end = serializers.DateField()


class TopSellingBeatSerializer(serializers.Serializer):
    beat = BeatSerializer()
    sales_count = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=10, decimal_places=2)


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
    selected_range = AnalyticsRangeSerializer()
    performance_series = AnalyticsSeriesPointSerializer(many=True)
    revenue_series = AnalyticsSeriesPointSerializer(many=True)
    top_beats = TopSellingBeatSerializer(many=True)
    audience_fit_producers = ProducerDiscoveryCardSerializer(many=True)


class HomeBeatShelfItemSerializer(serializers.Serializer):
    beat = BeatSerializer()
    session = ListeningSessionSerializer(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True)


class HomeShelfSerializer(serializers.Serializer):
    key = serializers.CharField()
    title = serializers.CharField()
    subtitle = serializers.CharField(required=False, allow_blank=True)
    see_more_path = serializers.CharField(required=False, allow_blank=True)
    beats = HomeBeatShelfItemSerializer(many=True, required=False)
    playlists = LibraryPlaylistSerializer(many=True, required=False)


class HomeFeedSerializer(serializers.Serializer):
    greeting = serializers.CharField()
    user_label = serializers.CharField(required=False, allow_blank=True)
    shelves = HomeShelfSerializer(many=True)

