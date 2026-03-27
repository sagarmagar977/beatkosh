from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from messaging.models import Conversation
from projects.models import Project, ProjectRequest


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
        self.producer_two = User.objects.create_user(
            username="projproducer2",
            email="projproducer2@example.com",
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

    def _create_project_request(self, producer_id=None):
        payload = {
            "title": "Album Beat Pack",
            "description": "Need 5 beats",
            "project_type": "album",
            "expected_track_count": 5,
            "preferred_genre": "Synthwave",
            "instrument_types": ["Piano", "Synthesizer", "Piano"],
            "mood_types": ["Dark", "Energetic", "Dark"],
            "target_genre_style": "Nephop with melodic hooks",
            "reference_links": ["https://example.com/ref"],
            "delivery_timeline_days": 21,
            "revision_allowance": 3,
            "budget": "500.00",
            "offer_price": "450.00",
        }
        if producer_id is not None:
            payload["producer"] = producer_id
        return self.client.post(reverse("project-request-create"), payload, format="json")

    def test_project_metadata_options(self):
        response = self.client.get(reverse("project-metadata-options"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["project_types"][0]["value"], "custom_single")
        self.assertIn("Synthwave", response.data["genres"])
        self.assertIn("Piano", response.data["instrument_types"])
        self.assertIn("Dark", response.data["moods"])

    def test_project_request_draft_create(self):
        response = self.client.post(
            reverse("project-request-draft-create"),
            {
                "title": "Rough draft",
                "project_type": "custom_single",
                "budget": "0.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], ProjectRequest.STATUS_DRAFT)
        self.assertEqual(response.data["workflow_label"], "Draft")

    def test_project_request_create_without_locked_producer(self):
        response = self._create_project_request()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["project_type"], "album")
        self.assertEqual(response.data["expected_track_count"], 5)
        self.assertEqual(response.data["preferred_genre"], "Synthwave")
        self.assertEqual(response.data["instrument_types"], ["Piano", "Synthesizer"])
        self.assertEqual(response.data["mood_types"], ["Dark", "Energetic"])
        self.assertEqual(response.data["offer_price"], "450.00")
        self.assertIsNone(response.data["producer"])

    def test_only_locked_producer_can_submit_targeted_brief_offer(self):
        req_response = self._create_project_request(producer_id=self.producer.id)
        self.assertEqual(req_response.status_code, status.HTTP_201_CREATED)

        producer_two_login = self.client.post(
            reverse("login"),
            {"username": "projproducer2", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {producer_two_login.data['access']}")
        proposal_response = self.client.post(
            reverse("project-proposal-create"),
            {"project_request": req_response.data["id"], "amount": "460.00", "message": "Pick me"},
            format="json",
        )
        self.assertEqual(proposal_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_artist_request_list_only_returns_own_ads(self):
        own_response = self._create_project_request()
        self.assertEqual(own_response.status_code, status.HTTP_201_CREATED)

        other_artist = User.objects.create_user(
            username="otherartist",
            email="otherartist@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=False,
            active_role="artist",
        )
        ProjectRequest.objects.create(
            artist=other_artist,
            title="Other Brief",
            description="Other brief",
            project_type="custom_single",
            budget="300.00",
        )

        response = self.client.get(reverse("project-request-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Album Beat Pack")

        draft_response = self.client.post(reverse("project-request-draft-create"), {"title": "Draft only"}, format="json")
        self.assertEqual(draft_response.status_code, status.HTTP_201_CREATED)

        refreshed = self.client.get(reverse("project-request-list"))
        self.assertEqual(refreshed.status_code, status.HTTP_200_OK)
        self.assertEqual(len(refreshed.data), 2)
        self.assertTrue(any(item["status"] == ProjectRequest.STATUS_DRAFT for item in refreshed.data))

    def test_producer_request_list_returns_open_and_targeted_briefs(self):
        open_response = self._create_project_request()
        targeted_response = self._create_project_request(producer_id=self.producer.id)
        hidden_response = self._create_project_request(producer_id=self.producer_two.id)
        self.assertEqual(open_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(targeted_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(hidden_response.status_code, status.HTTP_201_CREATED)

        producer_login = self.client.post(
            reverse("login"),
            {"username": "projproducer", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {producer_login.data['access']}")
        response = self.client.get(reverse("project-request-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertTrue(all(item["title"] == "Album Beat Pack" for item in response.data))
        self.assertTrue(any(item["producer"] is None for item in response.data))
        self.assertTrue(any(item["producer"] == self.producer.id for item in response.data))

    def test_artist_accepts_offer_and_selected_producer_becomes_project_owner(self):
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
        self.assertEqual(Project.objects.count(), 0)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {artist_login.data['access']}")
        accept_response = self.client.post(reverse("project-proposal-accept", args=[proposal_response.data["id"]]))
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)

        brief = ProjectRequest.objects.get(id=req_response.data["id"])
        self.assertEqual(brief.status, ProjectRequest.STATUS_ACCEPTED)
        self.assertEqual(brief.producer_id, self.producer.id)
        self.assertEqual(str(brief.offer_price), "450.00")

        project = Project.objects.get(title="Album Beat Pack")
        self.assertEqual(project.producer_id, self.producer.id)
        self.assertEqual(project.workflow_stage, Project.WORKFLOW_PROPOSAL_ACCEPTED)
        self.assertEqual(project.project_type, "album")
        self.assertEqual(project.preferred_genre, "Synthwave")
        self.assertEqual(project.instrument_types, ["Piano", "Synthesizer"])
        self.assertEqual(project.mood_types, ["Dark", "Energetic"])
        self.assertEqual(str(project.offer_price), "450.00")
        conversation = Conversation.objects.get(project=project)
        self.assertEqual(conversation.participants.count(), 2)
        self.assertTrue(conversation.participants.filter(id=self.artist.id).exists())
        self.assertTrue(conversation.participants.filter(id=self.producer.id).exists())
        self.assertEqual(accept_response.data["project"]["conversation_id"], conversation.id)
        self.assertEqual(accept_response.data["proposal"]["conversation_id"], conversation.id)

        projects_response = self.client.get(reverse("project-list"))
        self.assertEqual(projects_response.status_code, status.HTTP_200_OK)
        project_id = projects_response.data[0]["id"]
        self.assertEqual(projects_response.data[0]["workflow_summary"]["milestone_count"], 0)
        self.assertEqual(projects_response.data[0]["instrument_types"], ["Piano", "Synthesizer"])

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

    def test_producer_request_list_keeps_same_users_pending_briefs_visible(self):
        own_response = self._create_project_request()
        self.assertEqual(own_response.status_code, status.HTTP_201_CREATED)

        switch_response = self.client.post(reverse("start-selling"), {}, format="json")
        self.assertEqual(switch_response.status_code, status.HTTP_200_OK)

        response = self.client.get(reverse("project-request-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], own_response.data["id"])
        self.assertEqual(response.data[0]["status"], ProjectRequest.STATUS_PENDING)
