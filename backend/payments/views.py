import hashlib
import hmac
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order
from common.permissions import ensure_producer_mode
from payments.models import Payment, ProducerPayoutProfile, ProducerPlan, ProducerSubscription, ProducerWallet, Transaction
from payments.serializers import (
    EsewaCompleteSerializer,
    PaymentInitiateSerializer,
    PaymentSerializer,
    ProducerPayoutProfileSerializer,
    ProducerPlanSerializer,
    ProducerSubscriptionSerializer,
    ProducerWalletSerializer,
)
from payments.services import (
    build_gateway_checkout_data,
    check_esewa_transaction_status,
    decode_esewa_callback,
    mark_payment_failed,
    settle_successful_payment,
    verify_esewa_callback_signature,
)


def normalized_money(value) -> Decimal:
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError({"data": "Invalid eSewa amount."}) from exc


class PaymentInitiateView(generics.GenericAPIView):
    serializer_class = PaymentInitiateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        order = Order.objects.get(id=serializer.validated_data["order_id"], buyer=request.user)
        if order.status == Order.STATUS_PAID:
            return Response({"detail": "Order is already paid."}, status=status.HTTP_400_BAD_REQUEST)

        gateway = serializer.validated_data["gateway"]
        timestamp = timezone.now().strftime("%Y%m%d%H%M%S")
        external_ref = f"ord{order.id}-{timestamp}" if gateway == Payment.GATEWAY_ESEWA else f"{gateway}-{order.id}-{int(timezone.now().timestamp())}"
        payment = Payment.objects.create(
            order=order,
            gateway=gateway,
            amount=order.total_price,
            status=Payment.STATUS_PENDING,
            external_ref=external_ref,
        )
        payment.metadata = build_gateway_checkout_data(payment)
        payment.save(update_fields=["metadata"])
        Transaction.objects.create(
            payment=payment,
            txn_type=Transaction.TYPE_INITIATE,
            status=Payment.STATUS_PENDING,
            raw_payload={"order_id": order.id},
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class PaymentWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def _verify_signature(self, request, gateway: str):
        secret = settings.PAYMENT_WEBHOOK_SECRETS.get(gateway, "")
        if not secret:
            return
        signature = request.headers.get("X-BEATKOSH-SIGNATURE", "")
        expected = hmac.new(secret.encode("utf-8"), request.body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise PermissionDenied("Invalid webhook signature.")

    def post(self, request, gateway: str):
        self._verify_signature(request, gateway)
        payment_id = request.data.get("payment_id")
        outcome = request.data.get("outcome", "success")
        payment = Payment.objects.get(id=payment_id, gateway=gateway)
        if payment.status == Payment.STATUS_SUCCESS:
            return Response({"payment_id": payment.id, "status": payment.status, "idempotent": True})
        Transaction.objects.create(
            payment=payment,
            txn_type=Transaction.TYPE_WEBHOOK,
            status=Payment.STATUS_SUCCESS if outcome == "success" else Payment.STATUS_FAILED,
            raw_payload=request.data,
        )
        if outcome == "success":
            settle_successful_payment(payment)
        else:
            mark_payment_failed(payment, reason="Webhook reported failed outcome.")
        return Response({"payment_id": payment.id, "status": payment.status})


class PaymentEsewaCompleteView(generics.GenericAPIView):
    serializer_class = EsewaCompleteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment = Payment.objects.select_related("order").get(id=serializer.validated_data["payment_id"])
        if payment.order.buyer_id != request.user.id:
            raise PermissionDenied("You can only confirm your own payment.")
        if payment.gateway != Payment.GATEWAY_ESEWA:
            raise ValidationError({"payment_id": "This payment is not an eSewa payment."})
        if payment.status == Payment.STATUS_SUCCESS:
            return Response({"payment_id": payment.id, "status": payment.status, "idempotent": True}, status=status.HTTP_200_OK)

        callback_payload = decode_esewa_callback(serializer.validated_data["data"])
        if not verify_esewa_callback_signature(callback_payload):
            raise ValidationError({"data": "Invalid eSewa callback signature."})
        if str(callback_payload.get("transaction_uuid")) != payment.external_ref:
            raise ValidationError({"data": "eSewa transaction reference mismatch."})
        if str(callback_payload.get("product_code")) != settings.ESEWA_PRODUCT_CODE:
            raise ValidationError({"data": "eSewa product code mismatch."})

        callback_total = normalized_money(callback_payload.get("total_amount"))
        payment_total = normalized_money(payment.amount)
        if callback_total != payment_total:
            raise ValidationError({"data": "eSewa amount mismatch."})

        status_payload = check_esewa_transaction_status(payment)
        metadata = dict(payment.metadata or {})
        metadata["callback_payload"] = callback_payload
        metadata["status_check"] = status_payload
        payment.metadata = metadata
        payment.save(update_fields=["metadata"])

        gateway_status = str(status_payload.get("status", "")).upper()
        transaction_status = Payment.STATUS_PENDING
        if gateway_status == "COMPLETE":
            transaction_status = Payment.STATUS_SUCCESS
        elif gateway_status not in {"PENDING", "AMBIGUOUS"}:
            transaction_status = Payment.STATUS_FAILED

        Transaction.objects.create(
            payment=payment,
            txn_type=Transaction.TYPE_WEBHOOK,
            status=transaction_status,
            raw_payload={
                "callback": callback_payload,
                "status_check": status_payload,
            },
        )

        if gateway_status == "COMPLETE":
            settle_successful_payment(
                payment,
                verification_payload={
                    "callback": callback_payload,
                    "status_check": status_payload,
                },
            )
            return Response(
                {
                    "payment_id": payment.id,
                    "status": payment.status,
                    "gateway_status": gateway_status,
                    "order_id": payment.order_id,
                },
                status=status.HTTP_200_OK,
            )

        if gateway_status in {"PENDING", "AMBIGUOUS"}:
            return Response(
                {
                    "payment_id": payment.id,
                    "status": payment.status,
                    "gateway_status": gateway_status,
                    "order_id": payment.order_id,
                },
                status=status.HTTP_200_OK,
            )

        mark_payment_failed(
            payment,
            reason=f"eSewa status check returned {gateway_status or 'UNKNOWN'}.",
            extra_metadata={
                "callback_payload": callback_payload,
                "status_check": status_payload,
            },
        )
        return Response(
            {
                "payment_id": payment.id,
                "status": payment.status,
                "gateway_status": gateway_status,
                "order_id": payment.order_id,
            },
            status=status.HTTP_200_OK,
        )


class ProducerWalletMeView(generics.RetrieveAPIView):
    serializer_class = ProducerWalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        ensure_producer_mode(self.request.user)
        wallet, _ = ProducerWallet.objects.get_or_create(producer=self.request.user)
        return wallet


class PaymentSimulateSuccessView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        payment_id = request.data.get("payment_id")
        payment = Payment.objects.select_related("order").get(id=payment_id)
        if payment.order.buyer_id != request.user.id:
            raise PermissionDenied("You can only simulate payments for your own order.")
        settle_successful_payment(payment)
        return Response({"payment_id": payment.id, "status": payment.status}, status=status.HTTP_200_OK)


class PaymentConfirmView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        payment_id = request.data.get("payment_id")
        outcome = request.data.get("outcome", "success")
        payment = Payment.objects.select_related("order").get(id=payment_id)
        if payment.order.buyer_id != request.user.id:
            raise PermissionDenied("You can only confirm your own payment.")
        if payment.status == Payment.STATUS_SUCCESS:
            return Response({"payment_id": payment.id, "status": payment.status, "idempotent": True})
        if outcome == "success":
            settle_successful_payment(payment)
        else:
            mark_payment_failed(payment, reason="Manual confirm reported failed outcome.")
        return Response({"payment_id": payment.id, "status": payment.status}, status=status.HTTP_200_OK)


class ProducerPlanListView(generics.ListAPIView):
    serializer_class = ProducerPlanSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return ProducerPlan.objects.filter(is_active=True)


class ProducerSubscriptionMeView(generics.RetrieveUpdateAPIView):
    serializer_class = ProducerSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch"]

    def get_object(self):
        ensure_producer_mode(self.request.user)
        subscription = ProducerSubscription.objects.filter(producer=self.request.user).first()
        if subscription:
            return subscription

        default_plan = ProducerPlan.objects.filter(is_active=True).order_by("price").first()
        if not default_plan:
            raise PermissionDenied("No active plans are configured.")
        return ProducerSubscription.objects.create(producer=self.request.user, plan=default_plan)

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        subscription = self.get_object()
        serializer = self.get_serializer(subscription, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        subscription = self.get_object()
        serializer = self.get_serializer(subscription, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProducerPayoutProfileMeView(generics.RetrieveUpdateAPIView):
    serializer_class = ProducerPayoutProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        ensure_producer_mode(self.request.user)
        profile, _ = ProducerPayoutProfile.objects.get_or_create(producer=self.request.user)
        return profile
