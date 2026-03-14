from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from beats.models import Beat


class CatalogApiTests(APITestCase):
    def setUp(self):
        self.producer = User.objects.create_user(
            username="catalogproducer",
            email="catalogproducer@example.com",
            password="strong-pass-123",
            is_artist=False,
            is_producer=True,
            active_role="producer",
        )
        self.beat = Beat.objects.create(
            producer=self.producer,
            title="Test Beat",
            genre="Trap",
            bpm=140,
        )
        login = self.client.post(
            reverse("login"),
            {"username": "catalogproducer", "password": "strong-pass-123"},
            format="json",
        )
        self.token = login.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_create_bundle(self):
        response = self.client.post(
            reverse("bundle-list-create"),
            {"title": "Starter Pack", "price": "40.00", "discount": "10.00", "beat_ids": [self.beat.id]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_tape(self):
        response = self.client.post(
            reverse("tape-list-create"),
            {
                "title": "NepHop Vol.1",
                "description": "Tape test",
                "price": "60.00",
                "track_items": [{"beat": self.beat.id, "order": 1}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_soundkit_draft_publish_flow(self):
        draft_response = self.client.post(
            reverse("soundkit-upload-draft-list-create"),
            {
                "title": "Melody Vault",
                "kit_type": "Melody loops kit",
                "base_price": "15.00",
                "reference_links": ["https://example.com"],
            },
            format="json",
        )
        self.assertEqual(draft_response.status_code, status.HTTP_201_CREATED)
        draft_id = draft_response.data["id"]

        preview = SimpleUploadedFile("preview.mp3", b"fake-mp3", content_type="audio/mpeg")
        archive = SimpleUploadedFile("kit.zip", b"fake-zip", content_type="application/zip")
        media_response = self.client.patch(
            reverse("soundkit-upload-draft-detail", kwargs={"pk": draft_id}),
            {"preview_audio_upload": preview, "archive_file_upload": archive, "current_step": 3},
            format="multipart",
        )
        self.assertEqual(media_response.status_code, status.HTTP_200_OK)
        self.assertTrue(media_response.data["preview_audio_obj"])

        publish_response = self.client.post(
            reverse("soundkit-upload-draft-publish", kwargs={"draft_id": draft_id}),
            {},
            format="json",
        )
        self.assertEqual(publish_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(publish_response.data["title"], "Melody Vault")

    def test_soundkit_list_endpoint(self):
        create_response = self.client.post(
            reverse("soundkit-list-create"),
            {"title": "Drum Lab", "kit_type": "Drum kit", "base_price": "12.00"},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        list_response = self.client.get(reverse("soundkit-list-create"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(list_response.data), 1)
