from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ProducerFollow, ProducerProfile
from accounts.serializers import ProducerDiscoveryCardSerializer
from accounts.views import build_producer_trust_summary
from analytics_app.models import ActivityDrop, AnalyticsEvent, ListeningHistory
from analytics_app.serializers import (
    ActivityDropSerializer,
    CreateActivityDropSerializer,
    ListeningHistorySerializer,
    PlayBeatSerializer,
    ProducerDashboardSummarySerializer,
    RecommendationFeedSerializer,
)
from beats.models import Beat
from beats.serializers import BeatSerializer
from catalog.models import Bundle
from orders.models import OrderItem
from projects.models import ProjectRequest
from reviews.models import Review


class ProducerAnalyticsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, producer_id: int):
        beat_ids = list(Beat.objects.filter(producer_id=producer_id).values_list("id", flat=True))
        bundle_ids = list(Bundle.objects.filter(producer_id=producer_id).values_list("id", flat=True))

        beat_sales = OrderItem.objects.filter(
            order__status="paid",
            product_type=OrderItem.PRODUCT_BEAT,
            product_id__in=beat_ids,
        ).count()
        bundle_sales = OrderItem.objects.filter(
            order__status="paid",
            product_type=OrderItem.PRODUCT_BUNDLE,
            product_id__in=bundle_ids,
        ).count()

        review_stats = Review.objects.filter(producer_id=producer_id).aggregate(
            avg_rating=Avg("rating"),
            review_count=Count("id"),
        )
        return Response(
            {
                "producer_id": producer_id,
                "avg_rating": review_stats["avg_rating"] or 0,
                "review_count": review_stats["review_count"] or 0,
                "beat_sales": beat_sales,
                "bundle_sales": bundle_sales,
            }
        )


class ProducerDashboardSummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, producer_id: int):
        beat_queryset = (
            Beat.objects.filter(producer_id=producer_id, is_active=True)
            .select_related("producer", "producer__producer_profile")
            .prefetch_related("available_licenses", "likes")
        )
        beat_ids = list(beat_queryset.values_list("id", flat=True))
        producer_profile = ProducerProfile.objects.filter(user_id=producer_id).select_related("user").first()
        summary = build_producer_trust_summary(producer_profile.user) if producer_profile else None
        plays = AnalyticsEvent.objects.filter(event_type=AnalyticsEvent.EVENT_PLAY, producer_id=producer_id).count()
        skips = AnalyticsEvent.objects.filter(event_type=AnalyticsEvent.EVENT_SKIP, producer_id=producer_id).count()
        likes = beat_queryset.aggregate(total=Count("likes"))["total"] or 0
        purchases = OrderItem.objects.filter(order__status="paid", product_type=OrderItem.PRODUCT_BEAT, product_id__in=beat_ids).count()
        hiring_inquiry_count = ProjectRequest.objects.filter(producer_id=producer_id).count()
        follower_count = ProducerFollow.objects.filter(producer_id=producer_id).count()
        conversion_rate = round((purchases / plays) * 100, 2) if plays else 0.0
        top_beats = list(beat_queryset.order_by("-created_at")[:8])

        audience_candidates = ProducerProfile.objects.select_related("user").filter(user__is_producer=True).exclude(user_id=producer_id)[:3]
        audience_fit = []
        for candidate in audience_candidates:
            candidate_summary = build_producer_trust_summary(candidate.user)
            serialized = ProducerDiscoveryCardSerializer(candidate).data
            serialized["trust_score"] = candidate_summary["trust_score"]
            serialized["badges"] = candidate_summary["badges"]
            audience_fit.append(serialized)

        payload = {
            "producer_id": producer_id,
            "follower_count": follower_count,
            "verified": bool(summary and summary["verified"]),
            "plays": plays,
            "likes": likes,
            "purchases": purchases,
            "conversion_rate": conversion_rate,
            "skip_events": skips,
            "activity_drop_count": ActivityDrop.objects.filter(producer_id=producer_id).count(),
            "hiring_inquiry_count": hiring_inquiry_count,
            "top_beats": top_beats,
            "audience_fit_producers": audience_fit,
        }
        return Response(ProducerDashboardSummarySerializer(payload).data)


class ListeningRecentView(generics.ListAPIView):
    serializer_class = ListeningHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ListeningHistory.objects.filter(user=self.request.user)
            .select_related("beat", "beat__producer", "beat__producer__producer_profile")
            .prefetch_related("beat__available_licenses", "beat__likes", "beat__tags")
            .order_by("-last_played_at")[:20]
        )


class PlayBeatEventView(generics.GenericAPIView):
    serializer_class = PlayBeatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        beat = get_object_or_404(Beat, id=serializer.validated_data["beat_id"], is_active=True)
        history, _created = ListeningHistory.objects.get_or_create(user=request.user, beat=beat)
        history.play_count = history.play_count + 1
        history.save(update_fields=["play_count", "last_played_at"])
        AnalyticsEvent.objects.create(
            event_type=AnalyticsEvent.EVENT_PLAY,
            user=request.user,
            producer_id=beat.producer_id,
            beat_id=beat.id,
            metadata={"source": request.data.get("source", "artist-library")},
        )
        return Response(ListeningHistorySerializer(history).data, status=status.HTTP_200_OK)


class ActivityFeedView(generics.ListAPIView):
    serializer_class = ActivityDropSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        following_ids = list(
            ProducerFollow.objects.filter(artist=self.request.user).values_list("producer_id", flat=True)
        )
        if self.request.user.is_producer:
            following_ids.append(self.request.user.id)
        if not following_ids:
            return ActivityDrop.objects.none()
        return ActivityDrop.objects.filter(producer_id__in=following_ids).select_related("producer", "beat", "beat__producer")


class ActivityDropCreateView(generics.GenericAPIView):
    serializer_class = CreateActivityDropSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_producer:
            return Response({"detail": "Producer role required."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        beat = None
        beat_id = serializer.validated_data.get("beat_id")
        if beat_id:
            beat = get_object_or_404(Beat, id=beat_id, producer=request.user)
        drop = ActivityDrop.objects.create(
            producer=request.user,
            beat=beat,
            message=serializer.validated_data.get("message", ""),
        )
        return Response(ActivityDropSerializer(drop).data, status=status.HTTP_201_CREATED)


class RecommendedBeatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Beat.objects.filter(is_active=True).select_related("producer", "producer__producer_profile").prefetch_related("available_licenses", "likes", "tags")
        based_on = "trending catalog"
        if request.user.is_authenticated:
            listened_ids = list(ListeningHistory.objects.filter(user=request.user).values_list("beat_id", flat=True)[:8])
            followed_producers = list(ProducerFollow.objects.filter(artist=request.user).values_list("producer_id", flat=True))
            genre_values = list(Beat.objects.filter(id__in=listened_ids).values_list("genre", flat=True))
            mood_values = list(Beat.objects.filter(id__in=listened_ids).exclude(mood="").values_list("mood", flat=True))
            filtered = queryset.exclude(id__in=listened_ids)
            if genre_values:
                filtered = filtered.filter(genre__in=genre_values)
                based_on = "your listening history"
            if mood_values:
                filtered = filtered.filter(Q(mood__in=mood_values) | Q(mood=""))
            if followed_producers:
                filtered = filtered.filter(Q(producer_id__in=followed_producers) | Q(genre__in=genre_values))
                based_on = "followed producers and recent plays"
            queryset = filtered
        beats = list(queryset.order_by("-created_at")[:8])
        return Response(RecommendationFeedSerializer({"based_on": based_on, "beats": beats}).data)


class SimilarBeatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, beat_id: int):
        beat = get_object_or_404(
            Beat.objects.select_related("producer", "producer__producer_profile").prefetch_related("tags", "available_licenses", "likes"),
            id=beat_id,
            is_active=True,
        )
        candidates = list(
            Beat.objects.filter(is_active=True)
            .exclude(id=beat.id)
            .select_related("producer", "producer__producer_profile")
            .prefetch_related("available_licenses", "likes", "tags")[:80]
        )
        beat_tags = set(beat.tags.values_list("name", flat=True))
        beat_instruments = set(beat.instrument_types or ([beat.instrument_type] if beat.instrument_type else []))

        def score(candidate: Beat):
            score_value = 0
            candidate_tags = {tag.name for tag in candidate.tags.all()}
            candidate_instruments = set(
                candidate.instrument_types or ([candidate.instrument_type] if candidate.instrument_type else [])
            )
            if candidate.genre == beat.genre:
                score_value += 40
            if beat.mood and candidate.mood == beat.mood:
                score_value += 22
            if beat.beat_type and candidate.beat_type == beat.beat_type:
                score_value += 18
            if beat_instruments and beat_instruments.intersection(candidate_instruments):
                score_value += 14
            if beat.key and candidate.key == beat.key:
                score_value += 12
            bpm_distance = abs((candidate.bpm or 0) - (beat.bpm or 0))
            score_value += max(0, 20 - min(bpm_distance, 20))
            score_value += len(beat_tags.intersection(candidate_tags)) * 8
            if candidate.producer_id == beat.producer_id:
                score_value += 10
            score_value += min(candidate.likes.count(), 10)
            score_value += min(candidate.listening_events.aggregate(total=Count("id"))["total"] or 0, 8)
            return score_value

        ranked = sorted(candidates, key=lambda item: (score(item), item.created_at), reverse=True)
        beats = [item for item in ranked if score(item) > 0][:10]
        return Response(BeatSerializer(beats, many=True).data)


class SimilarProducersView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, producer_id: int):
        base_profile, _ = ProducerProfile.objects.select_related("user").get_or_create(user_id=producer_id)
        genres = [part.strip() for part in (base_profile.genres or "").split(",") if part.strip()]
        queryset = ProducerProfile.objects.select_related("user").filter(user__is_producer=True).exclude(user_id=producer_id)
        if genres:
            query = Q()
            for genre in genres:
                query |= Q(genres__icontains=genre)
            queryset = queryset.filter(query)
        queryset = queryset.order_by("-verified", "-total_sales")[:4]
        data = []
        for profile in queryset:
            summary = build_producer_trust_summary(profile.user)
            serialized = ProducerDiscoveryCardSerializer(profile).data
            serialized["trust_score"] = summary["trust_score"]
            serialized["badges"] = summary["badges"]
            data.append(serialized)
        return Response(data)


