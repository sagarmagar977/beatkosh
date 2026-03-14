import hashlib
import hmac

from django.conf import settings
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order
from payments.models import Payment, ProducerPayoutProfile, ProducerPlan, ProducerSubscription, ProducerWallet, Transaction
from payments.serializers import (
    PaymentInitiateSerializer,
    PaymentSerializer,
    ProducerPayoutProfileSerializer,
    ProducerPlanSerializer,
    ProducerSubscriptionSerializer,
    ProducerWalletSerializer,
)
from payments.services import build_gateway_checkout_data, settle_successful_payment


class PaymentInitiateView(generics.GenericAPIView):
    serializer_class = PaymentInitiateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        order = Order.objects.get(id=serializer.validated_data["order_id"], buyer=request.user)
        if order.status == Order.STATUS_PAID:
            return Response({"detail": "Order is already paid."}, status=status.HTTP_400_BAD_REQUEST)
        payment = Payment.objects.create(
            order=order,
            gateway=serializer.validated_data["gateway"],
            amount=order.total_price,
            status=Payment.STATUS_PENDING,
            external_ref=f"{serializer.validated_data['gateway']}-{order.id}-{int(timezone.now().timestamp())}",
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
            payment.status = Payment.STATUS_FAILED
            payment.save(update_fields=["status"])
            order = payment.order
            order.status = Order.STATUS_FAILED
            order.save(update_fields=["status"])
        return Response({"payment_id": payment.id, "status": payment.status})


class ProducerWalletMeView(generics.RetrieveAPIView):
    serializer_class = ProducerWalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
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
            payment.status = Payment.STATUS_FAILED
            payment.save(update_fields=["status"])
            order = payment.order
            order.status = Order.STATUS_FAILED
            order.save(update_fields=["status"])
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
        if not self.request.user.is_producer:
            raise PermissionDenied("Producer role required.")
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
        if not self.request.user.is_producer:
            raise PermissionDenied("Producer role required.")
        profile, _ = ProducerPayoutProfile.objects.get_or_create(producer=self.request.user)
        return profile
