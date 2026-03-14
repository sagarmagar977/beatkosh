from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ProducerFollow
from analytics_app.models import AnalyticsEvent, ListeningHistory
from analytics_app.models import ActivityDrop
from analytics_app.serializers import (
    ActivityDropSerializer,
    CreateActivityDropSerializer,
    ListeningHistorySerializer,
    PlayBeatSerializer,
)
from beats.models import Beat
from catalog.models import Bundle
from orders.models import OrderItem
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

        # Baseline metrics; can be replaced with richer event-driven analytics.
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


class ListeningRecentView(generics.ListAPIView):
    serializer_class = ListeningHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ListeningHistory.objects.filter(user=self.request.user)
            .select_related("beat", "beat__producer")
            .prefetch_related("beat__available_licenses")
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
            metadata={"source": "artist-library"},
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
