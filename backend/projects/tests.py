from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from projects.models import Project


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
                "project_type": "album",
                "expected_track_count": 5,
                "target_genre_style": "Nephop with melodic hooks",
                "reference_links": ["https://example.com/ref"],
                "delivery_timeline_days": 21,
                "revision_allowance": 3,
                "budget": "500.00",
            },
            format="json",
        )

    def test_project_request_create(self):
        response = self._create_project_request()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["project_type"], "album")
        self.assertEqual(response.data["expected_track_count"], 5)

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

        project = Project.objects.get(title="Album Beat Pack")
        self.assertEqual(project.workflow_stage, Project.WORKFLOW_PROPOSAL_ACCEPTED)
        self.assertEqual(project.project_type, "album")

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {artist_login.data['access']}")
        projects_response = self.client.get(reverse("project-list"))
        self.assertEqual(projects_response.status_code, status.HTTP_200_OK)
        project_id = projects_response.data[0]["id"]
        self.assertEqual(projects_response.data[0]["workflow_summary"]["milestone_count"], 0)

        milestone_response = self.client.post(
            reverse("milestone-create"),
            {
                "project": project_id,
                "title": "Beat Draft",
                "description": "First album demo pack",
                "amount": "200.00",
            },
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
                "version_label": "v1",
            },
            format="json",
        )
        self.assertEqual(deliverable_response.status_code, status.HTTP_201_CREATED)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {artist_login.data['access']}")
        project_refresh = self.client.get(reverse("project-list"))
        self.assertEqual(project_refresh.status_code, status.HTTP_200_OK)
        self.assertEqual(project_refresh.data[0]["milestones"][0]["deliverables"][0]["version_label"], "v1")
        self.assertEqual(project_refresh.data[0]["workflow_stage"], Project.WORKFLOW_DELIVERABLES_REVIEW)
