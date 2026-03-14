from rest_framework import serializers

from orders.models import Order
from payments.models import (
    Payment,
    ProducerPayoutProfile,
    ProducerPlan,
    ProducerSubscription,
    ProducerWallet,
    WalletLedgerEntry,
)


class PaymentInitiateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField(min_value=1)
    gateway = serializers.ChoiceField(choices=Payment.GATEWAY_CHOICES)

    def validate_order_id(self, value):
        request = self.context["request"]
        if not Order.objects.filter(id=value, buyer=request.user).exists():
            raise serializers.ValidationError("Order not found.")
        return value


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ("id", "order", "gateway", "status", "amount", "external_ref", "metadata", "created_at")


class WalletLedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletLedgerEntry
        fields = ("id", "amount", "note", "created_at")


class ProducerWalletSerializer(serializers.ModelSerializer):
    entries = WalletLedgerEntrySerializer(many=True, read_only=True)

    class Meta:
        model = ProducerWallet
        fields = ("id", "producer", "balance", "entries", "updated_at")


class ProducerPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProducerPlan
        fields = ("id", "code", "name", "price", "billing_cycle", "features", "is_active")


class ProducerSubscriptionSerializer(serializers.ModelSerializer):
    plan = ProducerPlanSerializer(read_only=True)
    plan_id = serializers.PrimaryKeyRelatedField(
        source="plan",
        queryset=ProducerPlan.objects.filter(is_active=True),
        write_only=True,
        required=True,
    )

    class Meta:
        model = ProducerSubscription
        fields = ("id", "producer", "plan", "plan_id", "status", "started_at", "renewed_at")
        read_only_fields = ("producer", "status", "started_at", "renewed_at")


class ProducerPayoutProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProducerPayoutProfile
        fields = (
            "id",
            "producer",
            "payout_name",
            "method",
            "account_number",
            "account_holder",
            "bank_name",
            "notes",
            "updated_at",
        )
        read_only_fields = ("producer", "updated_at")
