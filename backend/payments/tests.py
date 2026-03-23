import base64
import hashlib
import hmac
import json
from unittest.mock import patch

from django.conf import settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from beats.models import Beat, LicenseType
from orders.models import CartItem, DownloadAccess, PurchaseLicense
from payments.models import ProducerPlan, ProducerWallet
from payments.services import build_esewa_signature


class PaymentsApiTests(APITestCase):
    def setUp(self):
        self.producer = User.objects.create_user(
            username="payproducer",
            email="payproducer@example.com",
            password="strong-pass-123",
            is_artist=False,
            is_producer=True,
            active_role="producer",
        )
        self.artist = User.objects.create_user(
            username="payartist",
            email="payartist@example.com",
            password="strong-pass-123",
            is_artist=True,
            is_producer=False,
            active_role="artist",
        )
        self.license = LicenseType.objects.create(name="Premium", streams_limit=500000)
        ProducerPlan.objects.update_or_create(
            code="starter-monthly",
            defaults={
                "name": "Starter",
                "price": "0.00",
                "billing_cycle": "monthly",
                "features": ["basic upload"],
                "is_active": True,
            },
        )
        self.pro_plan, _ = ProducerPlan.objects.update_or_create(
            code="pro-monthly",
            defaults={
                "name": "Pro",
                "price": "29.00",
                "billing_cycle": "monthly",
                "features": ["priority listing", "advanced analytics"],
                "is_active": True,
            },
        )
        self.beat = Beat.objects.create(
            producer=self.producer,
            title="Payment Beat",
            genre="LoFi",
            bpm=90,
            base_price="50.00",
        )
        self.beat.available_licenses.add(self.license)

        login = self.client.post(
            reverse("login"),
            {"username": "payartist", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        self.client.post(
            reverse("cart-item-create"),
            {
                "product_type": "beat",
                "product_id": self.beat.id,
                "license_id": self.license.id,
            },
            format="json",
        )
        order_response = self.client.post(reverse("cart-checkout"), {}, format="json")
        self.order_id = order_response.data["id"]

    def test_payment_success_updates_wallet(self):
        payment_response = self.client.post(
            reverse("payment-initiate"),
            {"order_id": self.order_id, "gateway": "payu"},
            format="json",
        )
        self.assertEqual(payment_response.status_code, status.HTTP_201_CREATED)
        payment_id = payment_response.data["id"]

        webhook_response = self.client.post(
            reverse("payment-webhook", kwargs={"gateway": "payu"}),
            data=json.dumps({"payment_id": payment_id, "outcome": "success"}),
            content_type="application/json",
            HTTP_X_BEATKOSH_SIGNATURE=hmac.new(
                settings.PAYMENT_WEBHOOK_SECRETS["payu"].encode("utf-8"),
                json.dumps({"payment_id": payment_id, "outcome": "success"}).encode("utf-8"),
                hashlib.sha256,
            ).hexdigest(),
        )
        self.assertEqual(webhook_response.status_code, status.HTTP_200_OK)
        self.assertEqual(webhook_response.data["status"], "success")

        wallet = ProducerWallet.objects.get(producer=self.producer)
        self.assertEqual(str(wallet.balance), "45.00")
        self.assertEqual(CartItem.objects.filter(cart__buyer=self.artist).count(), 0)

    def test_payment_failure_keeps_cart_items(self):
        payment_response = self.client.post(
            reverse("payment-initiate"),
            {"order_id": self.order_id, "gateway": "khalti"},
            format="json",
        )
        payment_id = payment_response.data["id"]

        fail_response = self.client.post(
            reverse("payment-confirm"),
            {"payment_id": payment_id, "outcome": "failed"},
            format="json",
        )
        self.assertEqual(fail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(fail_response.data["status"], "failed")
        self.assertEqual(CartItem.objects.filter(cart__buyer=self.artist).count(), 1)

    def test_payment_webhook_rejects_invalid_signature(self):
        payment_response = self.client.post(
            reverse("payment-initiate"),
            {"order_id": self.order_id, "gateway": "payu"},
            format="json",
        )
        payment_id = payment_response.data["id"]

        webhook_response = self.client.post(
            reverse("payment-webhook", kwargs={"gateway": "payu"}),
            data=json.dumps({"payment_id": payment_id, "outcome": "success"}),
            content_type="application/json",
            HTTP_X_BEATKOSH_SIGNATURE="invalid",
        )
        self.assertEqual(webhook_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_producer_subscription_and_payout_profile(self):
        producer_login = self.client.post(
            reverse("login"),
            {"username": "payproducer", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {producer_login.data['access']}")

        plans_response = self.client.get(reverse("producer-plan-list"))
        self.assertEqual(plans_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(plans_response.data), 2)

        current_subscription_response = self.client.get(reverse("producer-subscription-me"))
        self.assertEqual(current_subscription_response.status_code, status.HTTP_200_OK)

        switch_response = self.client.post(
            reverse("producer-subscription-me"),
            {"plan_id": self.pro_plan.id},
            format="json",
        )
        self.assertEqual(switch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(switch_response.data["plan"]["code"], "pro-monthly")

        payout_response = self.client.patch(
            reverse("producer-payout-profile-me"),
            {
                "payout_name": "Primary payout",
                "method": "bank",
                "account_number": "123456789",
                "account_holder": "Beat Producer",
                "bank_name": "Nabil",
            },
            format="json",
        )
        self.assertEqual(payout_response.status_code, status.HTTP_200_OK)
        self.assertEqual(payout_response.data["method"], "bank")


    def test_producer_wallet_requires_active_producer_mode(self):
        self.producer.is_artist = True
        self.producer.active_role = "artist"
        self.producer.save(update_fields=["is_artist", "active_role"])

        producer_login = self.client.post(
            reverse("login"),
            {"username": "payproducer", "password": "strong-pass-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {producer_login.data['access']}")

        wallet_response = self.client.get(reverse("wallet-me"))
        self.assertEqual(wallet_response.status_code, status.HTTP_403_FORBIDDEN)

        payout_response = self.client.get(reverse("producer-payout-profile-me"))
        self.assertEqual(payout_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_payment_confirm_and_idempotent_behavior(self):
        payment_response = self.client.post(
            reverse("payment-initiate"),
            {"order_id": self.order_id, "gateway": "khalti"},
            format="json",
        )
        self.assertEqual(payment_response.status_code, status.HTTP_201_CREATED)
        payment_id = payment_response.data["id"]

        confirm_response = self.client.post(
            reverse("payment-confirm"),
            {"payment_id": payment_id, "outcome": "success"},
            format="json",
        )
        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)
        self.assertEqual(confirm_response.data["status"], "success")

        confirm_again = self.client.post(
            reverse("payment-confirm"),
            {"payment_id": payment_id, "outcome": "success"},
            format="json",
        )
        self.assertEqual(confirm_again.status_code, status.HTTP_200_OK)
        self.assertTrue(confirm_again.data["idempotent"])

    def test_cannot_initiate_payment_for_already_paid_order(self):
        first = self.client.post(
            reverse("payment-initiate"),
            {"order_id": self.order_id, "gateway": "khalti"},
            format="json",
        )
        payment_id = first.data["id"]
        self.client.post(
            reverse("payment-confirm"),
            {"payment_id": payment_id, "outcome": "success"},
            format="json",
        )
        second = self.client.post(
            reverse("payment-initiate"),
            {"order_id": self.order_id, "gateway": "khalti"},
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("payments.views.check_esewa_transaction_status")
    def test_esewa_complete_accepts_amount_with_single_decimal_place(self, mock_status_check):
        payment_response = self.client.post(
            reverse("payment-initiate"),
            {"order_id": self.order_id, "gateway": "esewa"},
            format="json",
        )
        self.assertEqual(payment_response.status_code, status.HTTP_201_CREATED)
        payment_id = payment_response.data["id"]
        payment_data = payment_response.data

        transaction_uuid = payment_data["external_ref"]
        callback_payload = {
            "transaction_code": "000TEST",
            "status": "COMPLETE",
            "total_amount": "50.0",
            "transaction_uuid": transaction_uuid,
            "product_code": settings.ESEWA_PRODUCT_CODE,
            "signed_field_names": "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
        }
        message = ",".join(
            f"{field}={callback_payload[field]}"
            for field in callback_payload["signed_field_names"].split(",")
        )
        callback_payload["signature"] = build_esewa_signature(message, settings.ESEWA_SECRET_KEY)
        encoded_payload = base64.b64encode(json.dumps(callback_payload).encode("utf-8")).decode("utf-8")

        mock_status_check.return_value = {
            "product_code": settings.ESEWA_PRODUCT_CODE,
            "transaction_uuid": transaction_uuid,
            "total_amount": 50.0,
            "status": "COMPLETE",
            "ref_id": "0001TS9",
        }

        complete_response = self.client.post(
            reverse("payment-esewa-complete"),
            {"payment_id": payment_id, "data": encoded_payload},
            format="json",
        )
        self.assertEqual(complete_response.status_code, status.HTTP_200_OK)
        self.assertEqual(complete_response.data["status"], "success")
        self.assertEqual(PurchaseLicense.objects.filter(order_item__order_id=self.order_id).count(), 1)
        self.assertEqual(DownloadAccess.objects.filter(order_item__order_id=self.order_id).count(), 1)
        self.assertEqual(CartItem.objects.filter(cart__buyer=self.artist).count(), 0)

        wallet = ProducerWallet.objects.get(producer=self.producer)
        self.assertEqual(str(wallet.balance), "45.00")
