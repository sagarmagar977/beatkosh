from django.db import models

from accounts.models import User
from orders.models import Order


class Payment(models.Model):
    STATUS_PENDING = "pending"
    STATUS_SUCCESS = "success"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILED, "Failed"),
    )

    GATEWAY_ESEWA = "esewa"
    GATEWAY_KHALTI = "khalti"
    GATEWAY_CONNECT_IPS = "connectips"
    GATEWAY_PAYU = "payu"
    GATEWAY_CHOICES = (
        (GATEWAY_ESEWA, "eSewa"),
        (GATEWAY_KHALTI, "Khalti"),
        (GATEWAY_CONNECT_IPS, "ConnectIPS"),
        (GATEWAY_PAYU, "PayU"),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    gateway = models.CharField(max_length=30, choices=GATEWAY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    external_ref = models.CharField(max_length=120, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Transaction(models.Model):
    TYPE_INITIATE = "initiate"
    TYPE_WEBHOOK = "webhook"
    TYPE_SETTLEMENT = "settlement"
    TYPE_CHOICES = (
        (TYPE_INITIATE, "Initiate"),
        (TYPE_WEBHOOK, "Webhook"),
        (TYPE_SETTLEMENT, "Settlement"),
    )

    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name="transactions")
    txn_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=Payment.STATUS_CHOICES, default=Payment.STATUS_PENDING)
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ProducerWallet(models.Model):
    producer = models.OneToOneField(User, on_delete=models.CASCADE, related_name="wallet")
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)


class WalletLedgerEntry(models.Model):
    wallet = models.ForeignKey(ProducerWallet, on_delete=models.CASCADE, related_name="entries")
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name="wallet_entries")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ProducerPlan(models.Model):
    BILLING_MONTHLY = "monthly"
    BILLING_YEARLY = "yearly"
    BILLING_CHOICES = (
        (BILLING_MONTHLY, "Monthly"),
        (BILLING_YEARLY, "Yearly"),
    )

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=120)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CHOICES, default=BILLING_MONTHLY)
    features = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("price",)

    def __str__(self) -> str:
        return self.name


class ProducerSubscription(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_CANCELLED = "cancelled"
    STATUS_EXPIRED = "expired"
    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_EXPIRED, "Expired"),
    )

    producer = models.OneToOneField(User, on_delete=models.CASCADE, related_name="subscription")
    plan = models.ForeignKey(ProducerPlan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    started_at = models.DateTimeField(auto_now_add=True)
    renewed_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.producer.username} -> {self.plan.code}"


class ProducerPayoutProfile(models.Model):
    producer = models.OneToOneField(User, on_delete=models.CASCADE, related_name="payout_profile")
    payout_name = models.CharField(max_length=120, blank=True)
    method = models.CharField(max_length=40, blank=True)
    account_number = models.CharField(max_length=120, blank=True)
    account_holder = models.CharField(max_length=120, blank=True)
    bank_name = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"PayoutProfile<{self.producer.username}>"

# Create your models here.
