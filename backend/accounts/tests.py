from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from beats.models import Beat


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
            {"producer_name": "Sagar Producer"},
            format="json",
        )
        self.assertEqual(producer_response.status_code, status.HTTP_200_OK)

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
