from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from messaging.models import Conversation


class MessagingApiTests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(
            username="msgusera",
            email="msgusera@example.com",
            password="strong-pass-123",
        )
        self.user_b = User.objects.create_user(
            username="msguserb",
            email="msguserb@example.com",
            password="strong-pass-123",
        )
        self.conversation = Conversation.objects.create()
        self.conversation.participants.set([self.user_a, self.user_b])
        login = self.client.post(
            reverse("login"),
            {"username": "msgusera", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def test_post_message(self):
        response = self.client.post(
            reverse("message-create"),
            {"conversation": self.conversation.id, "content": "Hello producer"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

