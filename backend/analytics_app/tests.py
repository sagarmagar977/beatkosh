from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from beats.models import Beat


class AnalyticsApiTests(APITestCase):
    def test_producer_analytics_endpoint(self):
        producer = User.objects.create_user(
            username="analyticsproducer",
            email="analyticsproducer@example.com",
            password="strong-pass-123",
            is_artist=False,
            is_producer=True,
            active_role="producer",
        )
        response = self.client.get(reverse("producer-analytics", kwargs={"producer_id": producer.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["producer_id"], producer.id)

    def test_listening_recent_and_play_event(self):
        producer = User.objects.create_user(
            username="beatowner",
            email="beatowner@example.com",
            password="strong-pass-123",
            is_artist=False,
            is_producer=True,
            active_role="producer",
        )
        artist = User.objects.create_user(
            username="artistuser",
            email="artistuser@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=False,
            active_role="artist",
        )
        beat = Beat.objects.create(
            producer=producer,
            title="Playable Beat",
            genre="HipHop",
            bpm=90,
            base_price="10.00",
        )
        login = self.client.post(
            reverse("login"),
            {"username": "artistuser", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        play_response = self.client.post(reverse("listening-play"), {"beat_id": beat.id}, format="json")
        self.assertEqual(play_response.status_code, status.HTTP_200_OK)
        self.assertEqual(play_response.data["play_count"], 1)

        recent_response = self.client.get(reverse("listening-recent"))
        self.assertEqual(recent_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(recent_response.data), 1)
        self.assertEqual(recent_response.data[0]["beat"]["id"], beat.id)

    def test_drops_feed_for_followed_producer(self):
        producer = User.objects.create_user(
            username="feedproducer",
            email="feedproducer@example.com",
            password="strong-pass-123",
            is_artist=False,
            is_producer=True,
            active_role="producer",
        )
        artist = User.objects.create_user(
            username="feedartist",
            email="feedartist@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=False,
            active_role="artist",
        )
        producer_login = self.client.post(
            reverse("login"),
            {"username": "feedproducer", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {producer_login.data['access']}")
        self.client.post(
            reverse("beat-list-create"),
            {"title": "Feed Beat", "genre": "Trap", "bpm": 140, "base_price": "12.00"},
            format="json",
        )

        artist_login = self.client.post(
            reverse("login"),
            {"username": "feedartist", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {artist_login.data['access']}")
        self.client.post(reverse("follow-producer", kwargs={"producer_id": producer.id}), {}, format="json")
        feed_response = self.client.get(reverse("drops-feed"))
        self.assertEqual(feed_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(feed_response.data), 1)
