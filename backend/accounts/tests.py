import shutil
from pathlib import Path
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from beats.models import Beat
from payments.models import ProducerPayoutProfile
from verification.models import VerificationRequest


class AccountsFlowTests(APITestCase):
    def setUp(self):
        self.register_url = reverse("register")
        self.login_url = reverse("login")
        self.switch_role_url = reverse("switch-role")
        self.me_url = reverse("me")

    def test_register_login_and_switch_role(self):
        register_payload = {
            "username": "producerartist",
            "email": "pa@example.com",
            "password": "strong-pass-123",
        }
        register_response = self.client.post(self.register_url, register_payload, format="json")
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(register_response.data["active_role"], "artist")
        self.assertFalse(register_response.data["is_producer"])

        login_response = self.client.post(
            self.login_url,
            {"username": "producerartist", "password": "strong-pass-123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        access_token = login_response.data["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        me_response = self.client.get(self.me_url)
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertFalse(me_response.data["is_producer"])

        start_selling_response = self.client.post(reverse("start-selling"), {}, format="json")
        self.assertEqual(start_selling_response.status_code, status.HTTP_200_OK)
        self.assertTrue(start_selling_response.data["is_producer"])
        self.assertEqual(start_selling_response.data["active_role"], "producer")

        switch_response = self.client.post(self.switch_role_url, {"role": "producer"}, format="json")
        self.assertEqual(switch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(switch_response.data["active_role"], "producer")

    def test_profile_setup_endpoints(self):
        register_payload = {
            "username": "creator",
            "email": "creator@example.com",
            "password": "strong-pass-123",
        }
        self.client.post(self.register_url, register_payload, format="json")
        login_response = self.client.post(
            self.login_url,
            {"username": "creator", "password": "strong-pass-123"},
            format="json",
        )
        access_token = login_response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        artist_response = self.client.patch(
            reverse("artist-profile-me"),
            {"stage_name": "Sagar Artist"},
            format="json",
        )
        self.assertEqual(artist_response.status_code, status.HTTP_200_OK)

        self.client.post(reverse("start-selling"), {}, format="json")
        producer_response = self.client.patch(
            reverse("producer-profile-me"),
            {
                "producer_name": "Sagar Producer",
                "headline": "Album-ready NepHop producer",
                "service_offerings": ["Custom single", "Album production"],
                "accepts_album_projects": True,
            },
            format="json",
        )
        self.assertEqual(producer_response.status_code, status.HTTP_200_OK)
        self.assertTrue(producer_response.data["accepts_album_projects"])

        temp_media_root = Path(__file__).resolve().parent.parent / "_test_media"
        if temp_media_root.exists():
            shutil.rmtree(temp_media_root, ignore_errors=True)
        temp_media_root.mkdir(parents=True, exist_ok=True)
        with override_settings(MEDIA_ROOT=str(temp_media_root)):
            avatar_upload = SimpleUploadedFile("avatar.jpg", b"fake-image-bytes", content_type="image/jpeg")
            avatar_response = self.client.patch(
                reverse("producer-profile-me"),
                {
                    "producer_name": "Sagar Producer Updated",
                    "avatar_upload": avatar_upload,
                },
                format="multipart",
            )
            self.assertEqual(avatar_response.status_code, status.HTTP_200_OK)
            self.assertEqual(avatar_response.data["producer_name"], "Sagar Producer Updated")
            self.assertIn("avatar_obj", avatar_response.data)
        shutil.rmtree(temp_media_root, ignore_errors=True)

    def test_follow_and_like_flow(self):
        producer = User.objects.create_user(
            username="socialproducer",
            email="socialproducer@example.com",
            password="strong-pass-123",
            is_artist=False,
            is_producer=True,
            active_role="producer",
        )
        artist = User.objects.create_user(
            username="socialartist",
            email="socialartist@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=False,
            active_role="artist",
        )
        beat = Beat.objects.create(
            producer=producer,
            title="Drop Beat",
            genre="HipHop",
            bpm=95,
            base_price="20.00",
        )

        login_response = self.client.post(
            self.login_url,
            {"username": "socialartist", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        follow_response = self.client.post(reverse("follow-producer", kwargs={"producer_id": producer.id}), {}, format="json")
        self.assertEqual(follow_response.status_code, status.HTTP_201_CREATED)

        following_response = self.client.get(reverse("follows-me"))
        self.assertEqual(following_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(following_response.data), 1)

        like_response = self.client.post(reverse("beat-like", kwargs={"beat_id": beat.id}), {}, format="json")
        self.assertEqual(like_response.status_code, status.HTTP_201_CREATED)

        likes_response = self.client.get(reverse("beat-likes-me"))
        self.assertEqual(likes_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(likes_response.data), 1)

    def test_featured_producer_candidates_for_mutual_and_one_way_follows(self):
        main = User.objects.create_user(
            username="mainproducer",
            email="mainproducer@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=True,
            active_role="producer",
        )
        mutual = User.objects.create_user(
            username="mutualproducer",
            email="mutualproducer@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=True,
            active_role="producer",
        )
        following = User.objects.create_user(
            username="followingproducer",
            email="followingproducer@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=True,
            active_role="producer",
        )
        follows_you = User.objects.create_user(
            username="followsyouproducer",
            email="followsyouproducer@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=True,
            active_role="producer",
        )

        self.client.post(self.login_url, {"username": "mainproducer", "password": "strong-pass-123"}, format="json")
        login_response = self.client.post(
            self.login_url,
            {"username": "mainproducer", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        self.client.post(reverse("follow-producer", kwargs={"producer_id": mutual.id}), {}, format="json")
        self.client.post(reverse("follow-producer", kwargs={"producer_id": following.id}), {}, format="json")

        self.client.credentials()
        mutual_login = self.client.post(self.login_url, {"username": "mutualproducer", "password": "strong-pass-123"}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {mutual_login.data['access']}")
        self.client.post(reverse("follow-producer", kwargs={"producer_id": main.id}), {}, format="json")

        follows_you_login = self.client.post(self.login_url, {"username": "followsyouproducer", "password": "strong-pass-123"}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {follows_you_login.data['access']}")
        self.client.post(reverse("follow-producer", kwargs={"producer_id": main.id}), {}, format="json")

        self.client.credentials()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")
        response = self.client.get(reverse("featured-producer-candidates"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["relation"] for item in response.data], ["mutual", "following", "follows_you"])
        self.assertEqual({item["username"] for item in response.data}, {"mutualproducer", "followingproducer", "followsyouproducer"})

    def test_producer_profile_lookup_by_user(self):
        producer = User.objects.create_user(
            username="profileproducer",
            email="profileproducer@example.com",
            password="strong-pass-123",
            is_artist=False,
            is_producer=True,
            active_role="producer",
        )
        response = self.client.get(reverse("producer-detail-by-user", kwargs={"user_id": producer.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_onboarding_and_public_trust_endpoints(self):
        producer = User.objects.create_user(
            username="trustproducer",
            email="trustproducer@example.com",
            password="strong-pass-123",
            is_artist=False,
            is_producer=True,
            active_role="producer",
        )
        login_response = self.client.post(
            self.login_url,
            {"username": "trustproducer", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")
        self.client.patch(
            reverse("producer-profile-me"),
            {
                "producer_name": "Trust Producer",
                "bio": "Detailed bio",
                "genres": "HipHop, Drill",
                "experience_years": 4,
                "service_offerings": ["Custom single", "Album production"],
                "accepts_album_projects": True,
            },
            format="json",
        )
        ProducerPayoutProfile.objects.create(
            producer=producer,
            method="bank",
            account_number="1234",
            account_holder="Trust Producer",
        )
        VerificationRequest.objects.create(
            user=producer,
            verification_type=VerificationRequest.TYPE_PRODUCER,
            status=VerificationRequest.STATUS_APPROVED,
        )

        agreement_response = self.client.post(reverse("producer-seller-agreement-me"), {"accepted_version": "v1"}, format="json")
        self.assertEqual(agreement_response.status_code, status.HTTP_200_OK)

        onboarding_response = self.client.get(reverse("producer-onboarding-me"))
        self.assertEqual(onboarding_response.status_code, status.HTTP_200_OK)
        self.assertGreater(onboarding_response.data["progress_percent"], 0)
        self.assertTrue(onboarding_response.data["trust_summary"]["seller_agreement_accepted"])

        public_trust = self.client.get(reverse("producer-trust-public", kwargs={"user_id": producer.id}))
        self.assertEqual(public_trust.status_code, status.HTTP_200_OK)
        self.assertIn("trust_score", public_trust.data)

        discovery_response = self.client.get(reverse("producer-discovery"))
        self.assertEqual(discovery_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(discovery_response.data), 1)
