from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from beats.models import Beat, LicenseType
from catalog.models import SoundKit
from orders.models import Order
from payments.models import Payment
from payments.services import settle_successful_payment


class OrdersApiTests(APITestCase):
    def setUp(self):
        self.producer = User.objects.create_user(
            username="orderproducer",
            email="orderproducer@example.com",
            password="strong-pass-123",
            is_artist=False,
            is_producer=True,
            active_role="producer",
        )
        self.artist = User.objects.create_user(
            username="orderartist",
            email="orderartist@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=False,
            active_role="artist",
        )
        self.license = LicenseType.objects.create(name="Basic", streams_limit=50000)
        self.beat = Beat.objects.create(
            producer=self.producer,
            title="Order Beat",
            genre="Drill",
            bpm=145,
            base_price="20.00",
            audio_file_obj=SimpleUploadedFile("hq.wav", b"hq-audio-bytes", content_type="audio/wav"),
        )
        self.beat.available_licenses.add(self.license)
        self.sound_kit = SoundKit.objects.create(
            producer=self.producer,
            title="Order Kit",
            kit_type="Drum kit",
            base_price="8.00",
        )

        login = self.client.post(
            reverse("login"),
            {"username": "orderartist", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def test_create_order(self):
        response = self.client.post(
            reverse("order-create"),
            {
                "items": [
                    {
                        "product_type": "beat",
                        "product_id": self.beat.id,
                        "license_id": self.license.id,
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["total_price"], "20.00")

    def test_create_soundkit_order_item(self):
        response = self.client.post(
            reverse("order-create"),
            {
                "items": [
                    {
                        "product_type": "soundkit",
                        "product_id": self.sound_kit.id,
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["total_price"], "8.00")

    def test_order_history_and_download_library(self):
        create_response = self.client.post(
            reverse("order-create"),
            {
                "items": [
                    {
                        "product_type": "beat",
                        "product_id": self.beat.id,
                        "license_id": self.license.id,
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(id=create_response.data["id"])
        payment = Payment.objects.create(order=order, gateway="khalti", amount=order.total_price)
        settle_successful_payment(payment)

        history_response = self.client.get(reverse("order-history"))
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history_response.data), 1)

        download_response = self.client.get(reverse("order-download-library"))
        self.assertEqual(download_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(download_response.data), 1)
        self.assertEqual(download_response.data[0]["order_status"], "paid")

        hq_url_response = self.client.get(reverse("order-download-hq-url", kwargs={"beat_id": self.beat.id}))
        self.assertEqual(hq_url_response.status_code, status.HTTP_200_OK)
        self.assertIn("download_url", hq_url_response.data)
