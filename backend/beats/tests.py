from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from accounts.models import User
from beats.models import LicenseType


class BeatsApiTests(APITestCase):
    def setUp(self):
        self.producer = User.objects.create_user(
            username="producer1",
            email="producer1@example.com",
            password="strong-pass-123",
            is_artist=False,
            is_producer=True,
            active_role="producer",
        )
        login = self.client.post(
            reverse("login"),
            {"username": "producer1", "password": "strong-pass-123"},
            format="json",
        )
        self.token = login.data["access"]

    def test_producer_can_create_and_list_beats(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        create_response = self.client.post(
            reverse("beat-list-create"),
            {
                "title": "Night Drive",
                "genre": "Hip Hop",
                "bpm": 95,
                "key": "Am",
                "mood": "Dark",
                "description": "Test beat",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        list_response = self.client.get(reverse("beat-list-create"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)

    def test_producer_can_upload_audio_file(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        audio = SimpleUploadedFile("beat.wav", b"fake-audio-content", content_type="audio/wav")
        with patch("beats.views.generate_stream_preview_for_beat", return_value=False) as preview_mock:
            response = self.client.post(
                reverse("beat-upload"),
                {
                    "title": "Upload Beat",
                    "genre": "Hip Hop",
                    "bpm": 100,
                    "base_price": "10.00",
                    "audio_file_upload": audio,
                },
                format="multipart",
            )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        preview_mock.assert_called_once()

    def test_upload_draft_workflow_publish(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        license_type = LicenseType.objects.create(name="Draft Basic", streams_limit=50000)

        create_draft_response = self.client.post(
            reverse("beat-upload-draft-list-create"),
            {
                "title": "Draft Song",
                "genre": "Trap",
                "bpm": 140,
                "base_price": "25.00",
                "selected_license_ids": [license_type.id],
                "current_step": 3,
            },
            format="json",
        )
        self.assertEqual(create_draft_response.status_code, status.HTTP_201_CREATED)
        draft_id = create_draft_response.data["id"]

        publish_response = self.client.post(
            reverse("beat-upload-draft-publish", kwargs={"draft_id": draft_id}),
            {},
            format="json",
        )
        self.assertEqual(publish_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(publish_response.data["title"], "Draft Song")

    def test_upload_draft_media_step(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        create_draft_response = self.client.post(
            reverse("beat-upload-draft-list-create"),
            {},
            format="json",
        )
        self.assertEqual(create_draft_response.status_code, status.HTTP_201_CREATED)
        draft_id = create_draft_response.data["id"]
        audio = SimpleUploadedFile("draft.wav", b"fake-draft-audio", content_type="audio/wav")

        patch_response = self.client.patch(
            reverse("beat-upload-draft-detail", kwargs={"pk": draft_id}),
            {"audio_file_upload": audio, "current_step": 1},
            format="multipart",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertTrue(patch_response.data["audio_file_obj"])

    def test_preview_generation_called_on_draft_update(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        draft_id = self.client.post(reverse("beat-upload-draft-list-create"), {}, format="json").data["id"]
        audio = SimpleUploadedFile("draft.wav", b"fake-draft-audio", content_type="audio/wav")
        with patch("beats.views.generate_stream_preview_for_draft", return_value=False) as preview_mock:
            response = self.client.patch(
                reverse("beat-upload-draft-detail", kwargs={"pk": draft_id}),
                {"audio_file_upload": audio, "current_step": 1},
                format="multipart",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        preview_mock.assert_called_once()

    def test_producer_must_be_in_producer_mode_for_write_actions(self):
        user = User.objects.create_user(
            username="modeuser",
            email="modeuser@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=True,
            active_role="artist",
        )
        login = self.client.post(
            reverse("login"),
            {"username": "modeuser", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        response = self.client.post(
            reverse("beat-list-create"),
            {"title": "Blocked Beat", "genre": "Hip Hop", "bpm": 100, "base_price": "10.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_metadata_options_endpoint(self):
        response = self.client.get(reverse("beat-metadata-options"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("beat_types", response.data)
        self.assertIn("genres", response.data)
        self.assertIn("instrument_types", response.data)
        self.assertIn("moods", response.data)
        self.assertIn("keys", response.data)
