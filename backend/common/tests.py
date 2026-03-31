from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from common.imagekit import build_imagekit_media_url


class HealthCheckTests(APITestCase):
    def test_health_endpoint(self):
        response = self.client.get(reverse("health-check"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")


class ImageKitUrlTests(APITestCase):
    @override_settings(
        IMAGEKIT_ENABLED=True,
        IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/demo",
        IMAGEKIT_MEDIA_ROOT="BeatKosh",
        IMAGEKIT_PRIVATE_KEY="test-private-key",
    )
    def test_build_imagekit_media_url_preserves_existing_relative_paths(self):
        url = build_imagekit_media_url("beats/audio/test beat.mp3")
        self.assertEqual(url, "https://ik.imagekit.io/demo/BeatKosh/beats/audio/test%20beat.mp3")
