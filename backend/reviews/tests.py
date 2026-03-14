from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User


class ReviewsApiTests(APITestCase):
    def setUp(self):
        self.artist = User.objects.create_user(
            username="reviewartist",
            email="reviewartist@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=False,
            active_role="artist",
        )
        self.producer = User.objects.create_user(
            username="reviewproducer",
            email="reviewproducer@example.com",
            password="strong-pass-123",
            is_artist=False,
            is_producer=True,
            active_role="producer",
        )
        login = self.client.post(
            reverse("login"),
            {"username": "reviewartist", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def test_create_review(self):
        response = self.client.post(
            reverse("review-create"),
            {"producer": self.producer.id, "rating": 5, "comment": "Great work"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

