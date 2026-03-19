import tempfile

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from beats.models import Beat, LicenseType
from catalog.models import SoundKit
from orders.models import CartItem, Order
from payments.models import Payment
from payments.services import settle_successful_payment


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
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
        self.wav_license = LicenseType.objects.create(name="Basic", streams_limit=50000, includes_wav=True)
        self.exclusive_license = LicenseType.objects.create(name="Exclusive", is_exclusive=True, includes_wav=True)
        self.beat = Beat.objects.create(
            producer=self.producer,
            title="Order Beat",
            genre="Drill",
            bpm=145,
            base_price="20.00",
            non_exclusive_wav_fee="20.00",
            exclusive_enabled=True,
            exclusive_license_fee="55.00"
        )
        self.beat.available_licenses.add(self.wav_license, self.exclusive_license)
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

    def test_add_item_to_cart_and_list_cart(self):
        response = self.client.post(
            reverse("cart-item-create"),
            {
                "product_type": "beat",
                "product_id": self.beat.id,
                "license_id": self.wav_license.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cart_response = self.client.get(reverse("cart-me"))
        self.assertEqual(cart_response.status_code, status.HTTP_200_OK)
        self.assertEqual(cart_response.data["item_count"], 1)
        self.assertEqual(cart_response.data["items"][0]["license_name"], "Basic")

    def test_update_cart_item_license_price(self):
        create_response = self.client.post(
            reverse("cart-item-create"),
            {
                "product_type": "beat",
                "product_id": self.beat.id,
                "license_id": self.wav_license.id,
            },
            format="json",
        )
        item_id = create_response.data["cart"]["items"][0]["id"]
        update_response = self.client.patch(
            reverse("cart-item-detail", kwargs={"item_id": item_id}),
            {"license_id": self.exclusive_license.id},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["items"][0]["license_name"], "Exclusive")
        self.assertEqual(update_response.data["items"][0]["price"], "55.00")

    def test_checkout_cart_creates_single_order(self):
        self.client.post(
            reverse("cart-item-create"),
            {
                "product_type": "beat",
                "product_id": self.beat.id,
                "license_id": self.wav_license.id,
            },
            format="json",
        )
        self.client.post(
            reverse("cart-item-create"),
            {
                "product_type": "soundkit",
                "product_id": self.sound_kit.id,
            },
            format="json",
        )
        response = self.client.post(reverse("cart-checkout"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["total_price"], "28.00")
        self.assertEqual(len(response.data["items"]), 2)
        self.assertEqual(CartItem.objects.filter(cart__buyer=self.artist).count(), 0)

    def test_create_order(self):
        response = self.client.post(
            reverse("order-create"),
            {
                "items": [
                    {
                        "product_type": "beat",
                        "product_id": self.beat.id,
                        "license_id": self.wav_license.id,
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["total_price"], "20.00")

    def test_order_history_and_download_library(self):
        create_response = self.client.post(
            reverse("order-create"),
            {
                "items": [
                    {
                        "product_type": "beat",
                        "product_id": self.beat.id,
                        "license_id": self.wav_license.id,
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

