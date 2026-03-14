from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User


class ProjectsApiTests(APITestCase):
    def setUp(self):
        self.artist = User.objects.create_user(
            username="projartist",
            email="projartist@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=False,
            active_role="artist",
        )
        self.producer = User.objects.create_user(
            username="projproducer",
            email="projproducer@example.com",
            password="strong-pass-123",
            is_artist=False,
            is_producer=True,
            active_role="producer",
        )
        login = self.client.post(
            reverse("login"),
            {"username": "projartist", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def _create_project_request(self):
        return self.client.post(
            reverse("project-request-create"),
            {
                "producer": self.producer.id,
                "title": "Album Beat Pack",
                "description": "Need 5 beats",
                "budget": "500.00",
            },
            format="json",
        )

    def test_project_request_create(self):
        response = self._create_project_request()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_milestone_and_deliverable_flow(self):
        req_response = self._create_project_request()
        self.assertEqual(req_response.status_code, status.HTTP_201_CREATED)

        artist_login = self.client.post(
            reverse("login"),
            {"username": "projartist", "password": "strong-pass-123"},
            format="json",
        )
        producer_login = self.client.post(
            reverse("login"),
            {"username": "projproducer", "password": "strong-pass-123"},
            format="json",
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {producer_login.data['access']}")
        proposal_response = self.client.post(
            reverse("project-proposal-create"),
            {"project_request": req_response.data["id"], "amount": "450.00", "message": "I can do this"},
            format="json",
        )
        self.assertEqual(proposal_response.status_code, status.HTTP_201_CREATED)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {artist_login.data['access']}")
        projects_response = self.client.get(reverse("project-list"))
        self.assertEqual(projects_response.status_code, status.HTTP_200_OK)
        project_id = projects_response.data[0]["id"]

        milestone_response = self.client.post(
            reverse("milestone-create"),
            {"project": project_id, "title": "Beat Draft", "amount": "200.00"},
            format="json",
        )
        self.assertEqual(milestone_response.status_code, status.HTTP_201_CREATED)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {producer_login.data['access']}")
        deliverable_response = self.client.post(
            reverse("deliverable-create"),
            {
                "milestone": milestone_response.data["id"],
                "note": "First draft delivered",
                "file_url": "https://example.com/file.wav",
            },
            format="json",
        )
        self.assertEqual(deliverable_response.status_code, status.HTTP_201_CREATED)
