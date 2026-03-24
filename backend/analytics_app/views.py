from collections import Counter
from datetime import timedelta

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import BeatLike, LibraryPlaylist, ProducerFollow, ProducerProfile
from accounts.serializers import LibraryPlaylistSerializer, ProducerDiscoveryCardSerializer
from accounts.views import build_producer_trust_summary
from analytics_app.models import ActivityDrop, AnalyticsEvent, ListeningHistory, ListeningSession, UserTasteProfile
from analytics_app.serializers import (
    ActivityDropSerializer,
    CreateActivityDropSerializer,
    HomeFeedSerializer,
    ListeningHistorySerializer,
    ListeningSessionFinishSerializer,
    ListeningSessionSerializer,
    ListeningSessionStartSerializer,
    PlayBeatSerializer,
    ProducerDashboardSummarySerializer,
    RecommendationFeedSerializer,
)
from beats.models import Beat
from beats.serializers import BeatSerializer
from catalog.models import Bundle
from common.permissions import ensure_producer_mode
from orders.models import OrderItem
from projects.models import ProjectRequest
from reviews.models import Review


RANGE_DAY_MAP = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "365d": 365,
}


def resolve_range_key(raw_value: str | None) -> tuple[str, int]:
    normalized = (raw_value or "30d").strip().lower()
    days = RANGE_DAY_MAP.get(normalized, 30)
    key = normalized if normalized in RANGE_DAY_MAP else "30d"
    return key, days


def build_daily_series(*, start_date, end_date, labels, plays_by_date, sales_by_date, revenue_by_date):
    total_days = (end_date - start_date).days + 1
    series = []
    revenue_series = []
    for index in range(total_days):
        current_date = start_date + timedelta(days=index)
        label = current_date.strftime(labels)
        plays_value = plays_by_date.get(current_date, 0)
        sales_value = sales_by_date.get(current_date, 0)
        revenue_value = float(revenue_by_date.get(current_date, 0) or 0)
        series.append(
            {
                "label": label,
                "plays": plays_value,
                "sales": sales_value,
                "revenue": round(revenue_value, 2),
            }
        )
        revenue_series.append(
            {
                "label": label,
                "revenue": round(revenue_value, 2),
            }
        )
    return series, revenue_series


BEAT_PREFETCH = ("available_licenses", "likes", "tags")


def build_greeting() -> str:
    hour = timezone.localtime().hour
    if hour < 12:
        return "Good morning"
    if hour < 18:
        return "Good afternoon"
    return "Good evening"


def beat_queryset():
    return Beat.objects.filter(is_active=True).select_related("producer", "producer__producer_profile").prefetch_related(*BEAT_PREFETCH)


def extract_moods(beat: Beat) -> set[str]:
    raw = beat.mood_types or ([beat.mood] if beat.mood else [])
    return {value for value in raw if value}


def extract_instruments(beat: Beat) -> set[str]:
    raw = beat.instrument_types or ([beat.instrument_type] if beat.instrument_type else [])
    return {value for value in raw if value}


def unique_latest_sessions(queryset, limit: int, *, predicate=None):
    sessions = []
    seen_beat_ids = set()
    for session in queryset:
        if predicate and not predicate(session):
            continue
        if session.beat_id in seen_beat_ids:
            continue
        seen_beat_ids.add(session.beat_id)
        sessions.append(session)
        if len(sessions) >= limit:
            break
    return sessions


def top_values(counter: Counter, limit: int = 5):
    return [value for value, _count in counter.most_common(limit) if value]


def serialize_home_beat_items(beats, *, session_map=None, note_builder=None):
    session_map = session_map or {}
    payload = []
    for beat in beats:
        session = session_map.get(beat.id)
        payload.append(
            {
                "beat": beat,
                "session": session,
                "note": note_builder(beat, session) if note_builder else "",
            }
        )
    return payload


def update_listening_history(*, user, beat, source: str = ""):
    history, _created = ListeningHistory.objects.get_or_create(user=user, beat=beat)
    history.play_count = history.play_count + 1
    history.save(update_fields=["play_count", "last_played_at"])
    AnalyticsEvent.objects.create(
        event_type=AnalyticsEvent.EVENT_PLAY,
        user=user,
        producer_id=beat.producer_id,
        beat_id=beat.id,
        metadata={"source": source or "player"},
    )
    return history


def refresh_user_taste_profile(user):
    profile, _created = UserTasteProfile.objects.get_or_create(user=user)
    sessions = list(
        ListeningSession.objects.filter(user=user)
        .select_related("beat", "beat__producer")
        .order_by("-started_at")[:240]
    )
    meaningful_sessions = [
        session
        for session in sessions
        if session.is_completed or session.listened_seconds >= 15 or session.completion_percent >= 30
    ]
    liked_beats = list(
        Beat.objects.filter(likes__user=user, is_active=True)
        .select_related("producer")
        .prefetch_related("tags")
        .distinct()
    )

    genre_counter = Counter()
    mood_counter = Counter()
    instrument_counter = Counter()
    producer_counter = Counter()
    bpm_values = []

    for session in meaningful_sessions:
        beat = session.beat
        genre_counter[beat.genre] += 3 if session.is_completed else 2
        producer_counter[beat.producer_id] += 3 if session.is_completed else 1
        if beat.bpm:
            bpm_values.append(beat.bpm)
        for mood in extract_moods(beat):
            mood_counter[mood] += 2
        for instrument in extract_instruments(beat):
            instrument_counter[instrument] += 2

    liked_genre_counter = Counter()
    for beat in liked_beats:
        genre_counter[beat.genre] += 4
        liked_genre_counter[beat.genre] += 1
        producer_counter[beat.producer_id] += 2
        if beat.bpm:
            bpm_values.append(beat.bpm)
        for mood in extract_moods(beat):
            mood_counter[mood] += 2
        for instrument in extract_instruments(beat):
            instrument_counter[instrument] += 2

    today_cutoff = timezone.now() - timedelta(hours=24)
    today_sessions = [session for session in meaningful_sessions if session.started_at >= today_cutoff]
    today_genres = Counter()
    today_moods = Counter()
    today_instruments = Counter()
    today_producers = Counter()
    today_bpms = []
    for session in today_sessions:
        beat = session.beat
        today_genres[beat.genre] += 2
        today_producers[beat.producer_id] += 2
        if beat.bpm:
            today_bpms.append(beat.bpm)
        for mood in extract_moods(beat):
            today_moods[mood] += 1
        for instrument in extract_instruments(beat):
            today_instruments[instrument] += 1

    bpm_min = min(bpm_values) if bpm_values else 0
    bpm_max = max(bpm_values) if bpm_values else 0
    bpm_average = round(sum(bpm_values) / len(bpm_values)) if bpm_values else 0

    profile.favorite_genres = top_values(genre_counter)
    profile.favorite_moods = top_values(mood_counter)
    profile.favorite_instruments = top_values(instrument_counter)
    profile.favorite_producer_ids = [int(value) for value in top_values(producer_counter)]
    profile.liked_genres = top_values(liked_genre_counter)
    profile.bpm_min = bpm_min
    profile.bpm_max = bpm_max
    profile.bpm_average = bpm_average
    profile.today_snapshot = {
        "favorite_genres": top_values(today_genres),
        "favorite_moods": top_values(today_moods),
        "favorite_instruments": top_values(today_instruments),
        "favorite_producer_ids": [int(value) for value in top_values(today_producers)],
        "bpm_min": min(today_bpms) if today_bpms else 0,
        "bpm_max": max(today_bpms) if today_bpms else 0,
        "bpm_average": round(sum(today_bpms) / len(today_bpms)) if today_bpms else 0,
        "window_hours": 24,
    }
    profile.save(
        update_fields=[
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
        ]
    )
    return profile


def recommend_beats_for_user(user, *, today_only: bool = False, limit: int = 8):
    profile = refresh_user_taste_profile(user)
    snapshot = profile.today_snapshot if today_only else {
        "favorite_genres": profile.favorite_genres,
        "favorite_moods": profile.favorite_moods,
        "favorite_instruments": profile.favorite_instruments,
        "favorite_producer_ids": profile.favorite_producer_ids,
        "bpm_min": profile.bpm_min,
        "bpm_max": profile.bpm_max,
        "bpm_average": profile.bpm_average,
    }

    candidate_queryset = beat_queryset().exclude(producer=user)
    recent_listened_ids = list(ListeningHistory.objects.filter(user=user).values_list("beat_id", flat=True)[:80])
    liked_ids = list(BeatLike.objects.filter(user=user).values_list("beat_id", flat=True))
    exclude_ids = set(recent_listened_ids).union(liked_ids)
    followed_ids = set(ProducerFollow.objects.filter(artist=user).values_list("producer_id", flat=True))
    genre_targets = set(snapshot.get("favorite_genres", []))
    mood_targets = set(snapshot.get("favorite_moods", []))
    instrument_targets = set(snapshot.get("favorite_instruments", []))
    producer_targets = set(snapshot.get("favorite_producer_ids", []))
    bpm_average = int(snapshot.get("bpm_average") or 0)

    ranked = []
    for beat in candidate_queryset.exclude(id__in=exclude_ids)[:180]:
        score = 0
        if beat.genre in genre_targets:
            score += 38
        if beat.genre in set(profile.liked_genres):
            score += 18
        beat_moods = extract_moods(beat)
        beat_instruments = extract_instruments(beat)
        score += len(mood_targets.intersection(beat_moods)) * 16
        score += len(instrument_targets.intersection(beat_instruments)) * 14
        if beat.producer_id in producer_targets:
            score += 24
        if beat.producer_id in followed_ids:
            score += 18
        if bpm_average and beat.bpm:
            score += max(0, 18 - min(abs(beat.bpm - bpm_average), 18))
        score += min(beat.likes.count(), 12)
        score += min(beat.listening_events.aggregate(total=Sum("play_count"))["total"] or 0, 18)
        if score > 0:
            ranked.append((score, beat.created_at, beat))

    ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)
    beats = [beat for _score, _created_at, beat in ranked[:limit]]
    based_on = "your last 24 hours" if today_only else "your listening history and likes"
    if not beats:
        beats = list(candidate_queryset.order_by("-created_at")[:limit])
        based_on = "fresh catalog"
    return based_on, beats


def build_home_feed_payload(user):
    playlists = list(
        LibraryPlaylist.objects.filter(owner=user)
        .prefetch_related("items__beat", "items__beat__producer", "items__beat__producer__producer_profile", "items__beat__available_licenses", "items__beat__likes", "items__beat__tags")[:8]
    )

    session_queryset = list(
        ListeningSession.objects.filter(user=user)
        .select_related("beat", "beat__producer", "beat__producer__producer_profile")
        .prefetch_related(*[f"beat__{value}" for value in BEAT_PREFETCH])
        .order_by("-started_at")[:120]
    )
    recent_history = list(
        ListeningHistory.objects.filter(user=user)
        .select_related("beat", "beat__producer", "beat__producer__producer_profile")
        .prefetch_related(*[f"beat__{value}" for value in BEAT_PREFETCH])
        .order_by("-last_played_at")[:8]
    )
    jump_back_sessions = unique_latest_sessions(
        session_queryset,
        8,
        predicate=lambda session: (
            not session.is_completed
            and session.listened_seconds >= 15
            and (session.duration_seconds == 0 or session.listened_seconds < session.duration_seconds)
        ),
    )
    jump_back_map = {session.beat_id: session for session in jump_back_sessions}

    based_on, made_for_you_beats = recommend_beats_for_user(user, today_only=False, limit=8)
    today_based_on, today_beats = recommend_beats_for_user(user, today_only=True, limit=8)

    followed_producer_ids = list(ProducerFollow.objects.filter(artist=user).values_list("producer_id", flat=True))
    followed_beats = list(beat_queryset().filter(producer_id__in=followed_producer_ids).order_by("-created_at")[:8])

    return {
        "greeting": build_greeting(),
        "user_label": user.username,
        "shelves": [
            {
                "key": "recently-played",
                "title": "Recently played",
                "subtitle": "Your latest listening history across the beats you played most recently.",
                "see_more_path": "/library",
                "beats": [
                    {
                        "beat": entry.beat,
                        "note": f"Played {entry.play_count} time{'s' if entry.play_count != 1 else ''}",
                    }
                    for entry in recent_history
                ],
            },
            {
                "key": "jump-back-in",
                "title": "Jump back in",
                "subtitle": "Pick up the beats you started but did not finish yet.",
                "see_more_path": "/library",
                "beats": serialize_home_beat_items(
                    [session.beat for session in jump_back_sessions],
                    session_map=jump_back_map,
                    note_builder=lambda _beat, session: (
                        f"{session.completion_percent}% finished" if session else ""
                    ),
                ),
            },
            {
                "key": "top-picks-today",
                "title": "Recommended for today",
                "subtitle": today_based_on,
                "see_more_path": "/beats-trending",
                "beats": serialize_home_beat_items(today_beats),
            },
            {
                "key": "made-for-you",
                "title": f"Made for {user.username}",
                "subtitle": based_on,
                "see_more_path": "/beats",
                "beats": serialize_home_beat_items(made_for_you_beats),
            },
            {
                "key": "playlists",
                "title": "Your playlists",
                "subtitle": "Top 5 recent and up to 8 ready to jump back into.",
                "see_more_path": "/library",
                "playlists": playlists,
            },
            {
                "key": "followed-producers",
                "title": "Beats from followed producers",
                "subtitle": "Fresh drops from producers you follow.",
                "see_more_path": "/activity",
                "beats": serialize_home_beat_items(followed_beats),
            },
        ],
    }


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
        range_key, range_days = resolve_range_key(request.query_params.get("range"))
        end_date = timezone.localdate()
        start_date = end_date - timedelta(days=range_days - 1)
        start_dt = timezone.make_aware(timezone.datetime.combine(start_date, timezone.datetime.min.time()))
        end_dt = timezone.make_aware(timezone.datetime.combine(end_date, timezone.datetime.max.time()))

        beat_queryset_for_producer = (
            Beat.objects.filter(producer_id=producer_id, is_active=True)
            .select_related("producer", "producer__producer_profile")
            .prefetch_related("available_licenses", "likes")
        )
        beat_ids = list(beat_queryset_for_producer.values_list("id", flat=True))
        producer_profile = ProducerProfile.objects.filter(user_id=producer_id).select_related("user").first()
        summary = build_producer_trust_summary(producer_profile.user) if producer_profile else None
        plays_queryset = AnalyticsEvent.objects.filter(
            event_type=AnalyticsEvent.EVENT_PLAY,
            producer_id=producer_id,
        )
        skips_queryset = AnalyticsEvent.objects.filter(
            event_type=AnalyticsEvent.EVENT_SKIP,
            producer_id=producer_id,
        )
        likes = beat_queryset_for_producer.aggregate(total=Count("likes"))["total"] or 0
        purchases_queryset = OrderItem.objects.filter(
            order__status="paid",
            product_type=OrderItem.PRODUCT_BEAT,
            product_id__in=beat_ids,
        )
        purchases = purchases_queryset.count()
        plays = plays_queryset.count()
        hiring_inquiry_count = ProjectRequest.objects.filter(producer_id=producer_id).count()
        follower_count = ProducerFollow.objects.filter(producer_id=producer_id).count()
        conversion_rate = round((purchases / plays) * 100, 2) if plays else 0.0
        top_beat_sales_rows = list(
            purchases_queryset.values("product_id")
            .annotate(sales_count=Count("id"), revenue=Sum("price"))
            .order_by("-sales_count", "-revenue", "product_id")[:5]
        )
        top_beat_ids = [row["product_id"] for row in top_beat_sales_rows]
        top_beat_map = {
            beat.id: beat
            for beat in beat_queryset_for_producer.filter(id__in=top_beat_ids)
        }
        top_beats = []
        for row in top_beat_sales_rows:
            beat = top_beat_map.get(row["product_id"])
            if beat is None:
                continue
            top_beats.append(
                {
                    "beat": beat,
                    "sales_count": row["sales_count"] or 0,
                    "revenue": row["revenue"] or 0,
                }
            )

        audience_candidates = ProducerProfile.objects.select_related("user").filter(user__is_producer=True).exclude(user_id=producer_id)[:3]
        audience_fit = []
        for candidate in audience_candidates:
            candidate_summary = build_producer_trust_summary(candidate.user)
            serialized = ProducerDiscoveryCardSerializer(candidate).data
            serialized["trust_score"] = candidate_summary["trust_score"]
            serialized["badges"] = candidate_summary["badges"]
            audience_fit.append(serialized)

        plays_by_date = {
            row["day"]: row["count"]
            for row in plays_queryset.filter(created_at__range=(start_dt, end_dt))
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
        }
        sales_by_date = {
            row["day"]: row["count"]
            for row in purchases_queryset.filter(order__created_at__range=(start_dt, end_dt))
            .annotate(day=TruncDate("order__created_at"))
            .values("day")
            .annotate(count=Count("id"))
        }
        revenue_by_date = {
            row["day"]: row["revenue"]
            for row in purchases_queryset.filter(order__created_at__range=(start_dt, end_dt))
            .annotate(day=TruncDate("order__created_at"))
            .values("day")
            .annotate(revenue=Sum("price"))
        }
        label_format = "%b %d" if range_days > 31 else "%d %b"
        performance_series, revenue_series = build_daily_series(
            start_date=start_date,
            end_date=end_date,
            labels=label_format,
            plays_by_date=plays_by_date,
            sales_by_date=sales_by_date,
            revenue_by_date=revenue_by_date,
        )

        payload = {
            "producer_id": producer_id,
            "follower_count": follower_count,
            "verified": bool(summary and summary["verified"]),
            "plays": plays,
            "likes": likes,
            "purchases": purchases,
            "conversion_rate": conversion_rate,
            "skip_events": skips_queryset.count(),
            "activity_drop_count": ActivityDrop.objects.filter(producer_id=producer_id).count(),
            "hiring_inquiry_count": hiring_inquiry_count,
            "selected_range": {
                "key": range_key,
                "days": range_days,
                "start": start_date,
                "end": end_date,
            },
            "performance_series": performance_series,
            "revenue_series": revenue_series,
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
        history = update_listening_history(user=request.user, beat=beat, source=serializer.validated_data.get("source", "legacy-play"))
        return Response(ListeningHistorySerializer(history).data, status=status.HTTP_200_OK)


class ListeningSessionStartView(generics.GenericAPIView):
    serializer_class = ListeningSessionStartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        beat = get_object_or_404(Beat, id=serializer.validated_data["beat_id"], is_active=True)
        source = serializer.validated_data.get("source", "player")
        resume = serializer.validated_data.get("resume", False)
        session = ListeningSession.objects.create(user=request.user, beat=beat, source=source)
        if not resume:
            update_listening_history(user=request.user, beat=beat, source=source)
        return Response(ListeningSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class ListeningSessionFinishView(generics.GenericAPIView):
    serializer_class = ListeningSessionFinishSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = get_object_or_404(ListeningSession, id=serializer.validated_data["session_id"], user=request.user)

        listened_seconds = serializer.validated_data["listened_seconds"]
        duration_seconds = serializer.validated_data.get("duration_seconds", session.duration_seconds)
        if duration_seconds and listened_seconds > duration_seconds:
            listened_seconds = duration_seconds

        completion_percent = round((listened_seconds / duration_seconds) * 100) if duration_seconds else 0
        end_reason = serializer.validated_data.get("end_reason", ListeningSession.END_REASON_UNKNOWN)
        is_completed = bool(duration_seconds and completion_percent >= 90)
        is_skipped = bool(listened_seconds > 0 and not is_completed and completion_percent < 70)

        session.listened_seconds = listened_seconds
        session.duration_seconds = duration_seconds or 0
        session.completion_percent = completion_percent
        session.end_reason = end_reason
        session.is_completed = is_completed
        session.is_skipped = is_skipped
        session.save(
            update_fields=[
                "listened_seconds",
                "duration_seconds",
                "completion_percent",
                "end_reason",
                "is_completed",
                "is_skipped",
                "last_event_at",
            ]
        )

        if is_skipped:
            AnalyticsEvent.objects.create(
                event_type=AnalyticsEvent.EVENT_SKIP,
                user=request.user,
                producer_id=session.beat.producer_id,
                beat_id=session.beat_id,
                metadata={"source": session.source or "player", "completion_percent": completion_percent},
            )

        refresh_user_taste_profile(request.user)
        return Response(ListeningSessionSerializer(session).data, status=status.HTTP_200_OK)


class ListeningHomeFeedView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payload = build_home_feed_payload(request.user)
        return Response(HomeFeedSerializer(payload).data)


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
        ensure_producer_mode(request.user)
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
        if request.user.is_authenticated:
            based_on, beats = recommend_beats_for_user(request.user, today_only=False, limit=8)
        else:
            based_on = "trending catalog"
            beats = list(beat_queryset().order_by("-created_at")[:8])
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
        beat_instruments = extract_instruments(beat)
        beat_moods = extract_moods(beat)

        def score(candidate: Beat):
            score_value = 0
            candidate_tags = {tag.name for tag in candidate.tags.all()}
            candidate_instruments = extract_instruments(candidate)
            candidate_moods = extract_moods(candidate)
            if candidate.genre == beat.genre:
                score_value += 40
            if beat_moods and beat_moods.intersection(candidate_moods):
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
        base_profile, _created = ProducerProfile.objects.select_related("user").get_or_create(user_id=producer_id)
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

