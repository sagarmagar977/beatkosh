from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User


class VerificationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="verifyuser",
            email="verifyuser@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=True,
            active_role="artist",
        )
        login = self.client.post(
            reverse("login"),
            {"username": "verifyuser", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def test_create_verification_request(self):
        response = self.client.post(
            reverse("verification-request-create"),
            {"verification_type": "producer", "submitted_documents": [{"type": "id"}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_can_approve_verification(self):
        create_response = self.client.post(
            reverse("verification-request-create"),
            {"verification_type": "producer", "submitted_documents": [{"type": "id"}]},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        admin = User.objects.create_user(
            username="adminuser",
            email="admin@example.com",
            password="strong-pass-123",
            is_staff=True,
            is_superuser=True,
        )
        admin_login = self.client.post(
            reverse("login"),
            {"username": "adminuser", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_login.data['access']}")

        decision_response = self.client.post(
            reverse("verification-decision", kwargs={"request_id": create_response.data["id"]}),
            {"decision": "approved"},
            format="json",
        )
        self.assertEqual(decision_response.status_code, status.HTTP_200_OK)
        self.assertEqual(decision_response.data["status"], "approved")
