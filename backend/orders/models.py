from django.db import models

from accounts.models import User
from beats.models import Beat, LicenseType


class Order(models.Model):
    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_PAID, "Paid"),
        (STATUS_FAILED, "Failed"),
    )

    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)


class OrderItem(models.Model):
    PRODUCT_BEAT = "beat"
    PRODUCT_SOUNDKIT = "soundkit"
    PRODUCT_BUNDLE = "bundle"
    PRODUCT_TAPE = "tape"
    PRODUCT_TYPE_CHOICES = (
        (PRODUCT_BEAT, "Beat"),
        (PRODUCT_SOUNDKIT, "SoundKit"),
        (PRODUCT_BUNDLE, "Bundle"),
        (PRODUCT_TAPE, "BeatTape"),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPE_CHOICES)
    product_id = models.PositiveIntegerField()
    product_title = models.CharField(max_length=200)
    license_type = models.ForeignKey(LicenseType, on_delete=models.SET_NULL, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)


class PurchaseLicense(models.Model):
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="purchased_licenses")
    beat = models.ForeignKey(Beat, on_delete=models.CASCADE, related_name="purchases")
    license_type = models.ForeignKey(LicenseType, on_delete=models.CASCADE)
    order_item = models.OneToOneField(OrderItem, on_delete=models.CASCADE, related_name="purchase_license")
    created_at = models.DateTimeField(auto_now_add=True)


class DownloadAccess(models.Model):
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="download_access")
    beat = models.ForeignKey(Beat, on_delete=models.CASCADE, related_name="download_access")
    order_item = models.OneToOneField(OrderItem, on_delete=models.CASCADE, related_name="download_access")
    granted_at = models.DateTimeField(auto_now_add=True)

# Create your models here.
