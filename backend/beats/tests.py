from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import BeatLike, User
from analytics_app.models import AnalyticsEvent
from beats.models import Beat, BeatTrendSnapshot, FeaturedCoverPhoto, LicenseType
from orders.models import Order, OrderItem, PurchaseLicense


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

    def test_upload_draft_persists_multiple_instruments_and_moods(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        create_draft_response = self.client.post(
            reverse("beat-upload-draft-list-create"),
            {
                "title": "Layered Beat",
                "genre": "Trap",
                "bpm": 140,
                "base_price": "25.00",
                "instrument_types": ["Piano", "Synthesizer", "Flute"],
                "mood_types": ["Dark", "Energetic", "Dark"],
                "media": {"tags": ["ram", "boom bap"]},
                "current_step": 2,
            },
            format="json",
        )
        self.assertEqual(create_draft_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_draft_response.data["instrument_types"], ["Piano", "Synthesizer", "Flute"])
        self.assertEqual(create_draft_response.data["instrument_type"], "Piano")
        self.assertEqual(create_draft_response.data["mood_types"], ["Dark", "Energetic"])
        self.assertEqual(create_draft_response.data["mood"], "Dark")

        draft_id = create_draft_response.data["id"]
        publish_response = self.client.post(
            reverse("beat-upload-draft-publish", kwargs={"draft_id": draft_id}),
            {},
            format="json",
        )
        self.assertEqual(publish_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(publish_response.data["instrument_types"], ["Piano", "Synthesizer", "Flute"])
        self.assertEqual(publish_response.data["instrument_type"], "Piano")
        self.assertEqual(publish_response.data["mood_types"], ["Dark", "Energetic"])
        self.assertEqual(publish_response.data["mood"], "Dark")
        self.assertEqual(sorted(publish_response.data["tag_names"]), ["boom bap", "ram"])

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

    def test_featured_cover_list_endpoint(self):
        FeaturedCoverPhoto.objects.create(
            title="Midnight Texture",
            image=SimpleUploadedFile("cover.jpg", b"fake-image", content_type="image/jpeg"),
            is_active=True,
        )
        response = self.client.get(reverse("featured-cover-photo-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Midnight Texture")

    def test_producer_can_create_beat_with_featured_cover(self):
        featured_cover = FeaturedCoverPhoto.objects.create(
            title="Silver Haze",
            image=SimpleUploadedFile("featured.jpg", b"fake-image", content_type="image/jpeg"),
            is_active=True,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        response = self.client.post(
            reverse("beat-upload"),
            {
                "title": "Featured Cover Beat",
                "genre": "Hip Hop",
                "bpm": 98,
                "base_price": "15.00",
                "featured_cover_photo_id": featured_cover.id,
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["cover_art_obj"])
        self.assertEqual(response.data["featured_cover_photo"], featured_cover.id)


class FeaturedCoverPhotoAdminTests(APITestCase):
    def setUp(self):
        self.superuser = get_user_model().objects.create_superuser(
            username="adminuser",
            email="admin@example.com",
            password="strong-pass-123",
        )
        self.client.force_login(self.superuser)

    def test_bulk_upload_skips_duplicate_images(self):
        image_one = SimpleUploadedFile("cover-one.jpg", b"same-image-bytes", content_type="image/jpeg")
        image_two = SimpleUploadedFile("cover-two.jpg", b"same-image-bytes", content_type="image/jpeg")

        response = self.client.post(
            reverse("admin:beats_featuredcoverphoto_bulk_upload"),
            {"files": [image_one, image_two], "is_active": "on"},
            format="multipart",
            follow=True,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(FeaturedCoverPhoto.objects.count(), 1)
        self.assertTrue(FeaturedCoverPhoto.objects.first().checksum)


class BeatTrendingSnapshotTests(APITestCase):
    def setUp(self):
        self.producer = User.objects.create_user(
            username="trendproducer",
            email="trendproducer@example.com",
            password="strong-pass-123",
            is_artist=False,
            is_producer=True,
            active_role="producer",
        )
        self.artist = User.objects.create_user(
            username="trendartist",
            email="trendartist@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=False,
            active_role="artist",
        )
        now = timezone.now()
        self.daily_beat = Beat.objects.create(
            producer=self.producer,
            title="Fresh Heat",
            genre="Hip Hop",
            bpm=98,
            base_price="15.00",
        )
        self.weekly_beat = Beat.objects.create(
            producer=self.producer,
            title="Week Runner",
            genre="Trap",
            bpm=140,
            base_price="20.00",
        )
        Beat.objects.filter(id=self.daily_beat.id).update(created_at=now - timedelta(hours=6))
        Beat.objects.filter(id=self.weekly_beat.id).update(created_at=now - timedelta(days=3))
        self.daily_beat.refresh_from_db()
        self.weekly_beat.refresh_from_db()

        daily_like = BeatLike.objects.create(user=self.artist, beat=self.daily_beat)
        BeatLike.objects.filter(id=daily_like.id).update(created_at=now - timedelta(hours=4))
        weekly_like = BeatLike.objects.create(
            user=User.objects.create_user(
                username="weekliker",
                email="weekliker@example.com",
                password="strong-pass-123",
                is_artist=True,
                is_producer=False,
                active_role="artist",
            ),
            beat=self.weekly_beat,
        )
        BeatLike.objects.filter(id=weekly_like.id).update(created_at=now - timedelta(days=2))

        for offset_hours in (1, 2, 3, 4, 5, 6):
            event = AnalyticsEvent.objects.create(
                event_type=AnalyticsEvent.EVENT_PLAY,
                user=self.artist,
                producer_id=self.producer.id,
                beat_id=self.daily_beat.id,
            )
            AnalyticsEvent.objects.filter(id=event.id).update(created_at=now - timedelta(hours=offset_hours))
        for offset_hours in (36, 40, 44, 48, 52, 56, 60, 64):
            event = AnalyticsEvent.objects.create(
                event_type=AnalyticsEvent.EVENT_PLAY,
                user=self.artist,
                producer_id=self.producer.id,
                beat_id=self.weekly_beat.id,
            )
            AnalyticsEvent.objects.filter(id=event.id).update(created_at=now - timedelta(hours=offset_hours))

        order = Order.objects.create(buyer=self.artist, total_price="15.00", status=Order.STATUS_PAID)
        order_item = OrderItem.objects.create(
            order=order,
            product_type=OrderItem.PRODUCT_BEAT,
            product_id=self.daily_beat.id,
            product_title=self.daily_beat.title,
            price="15.00",
        )
        purchase = PurchaseLicense.objects.create(
            buyer=self.artist,
            beat=self.daily_beat,
            license_type=LicenseType.objects.create(name="Trend License"),
            order_item=order_item,
        )
        PurchaseLicense.objects.filter(id=purchase.id).update(created_at=now - timedelta(hours=3))

    def test_refresh_command_builds_daily_and_weekly_snapshots(self):
        output = StringIO()
        call_command("refresh_beat_trends", stdout=output)

        daily_rows = BeatTrendSnapshot.objects.filter(period=BeatTrendSnapshot.PERIOD_DAILY).order_by("rank")
        weekly_rows = BeatTrendSnapshot.objects.filter(period=BeatTrendSnapshot.PERIOD_WEEKLY).order_by("rank")

        self.assertEqual(daily_rows.count(), 1)
        self.assertEqual(daily_rows.first().beat_id, self.daily_beat.id)
        self.assertGreaterEqual(weekly_rows.count(), 2)
        self.assertEqual(weekly_rows.first().beat_id, self.daily_beat.id)
        self.assertIn("Refreshed daily beat trends", output.getvalue())

    def test_daily_and_weekly_endpoints_return_ranked_snapshots(self):
        call_command("refresh_beat_trends")

        daily_response = self.client.get(reverse("beat-trending-daily"))
        weekly_response = self.client.get(reverse("beat-trending-weekly"))
        default_response = self.client.get(reverse("beat-trending"))

        self.assertEqual(daily_response.status_code, status.HTTP_200_OK)
        self.assertEqual(weekly_response.status_code, status.HTTP_200_OK)
        self.assertEqual(default_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(daily_response.data), 1)
        self.assertEqual(daily_response.data[0]["beat_id"], self.daily_beat.id)
        self.assertEqual(daily_response.data[0]["play_count"], 6)
        self.assertEqual(weekly_response.data[0]["rank"], 1)
        self.assertEqual(default_response.data[0]["beat_id"], weekly_response.data[0]["beat_id"])
