import base64
import hashlib
import hmac
import json
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode
from urllib.request import urlopen

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from beats.models import Beat
from catalog.models import BeatTape, Bundle, SoundKit
from orders.models import CartItem, DownloadAccess, Order, OrderItem, PurchaseLicense
from payments.models import Payment, ProducerWallet, Transaction, WalletLedgerEntry

PLATFORM_COMMISSION_RATE = Decimal("0.10")
ESEWA_SIGNED_FIELD_NAMES = ("total_amount", "transaction_uuid", "product_code")


def format_currency(value: Decimal) -> str:
    return format(value.quantize(Decimal("0.01")), "f")


def parse_currency(value) -> Decimal:
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError("Invalid currency value.") from exc


def build_esewa_signature(message: str, secret: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(digest).decode("utf-8")


def build_esewa_message(field_names: list[str] | tuple[str, ...], payload: dict) -> str:
    return ",".join(f"{field_name}={payload[field_name]}" for field_name in field_names)


def build_esewa_checkout_data(payment: Payment) -> dict:
    total_amount = format_currency(payment.amount)
    return_base = f"{settings.PAYMENT_FRONTEND_BASE_URL}/orders/esewa-return"
    form_fields = {
        "amount": total_amount,
        "tax_amount": "0",
        "total_amount": total_amount,
        "transaction_uuid": payment.external_ref,
        "product_code": settings.ESEWA_PRODUCT_CODE,
        "product_service_charge": "0",
        "product_delivery_charge": "0",
        "success_url": f"{return_base}/{payment.id}",
        "failure_url": f"{return_base}/failure/{payment.id}",
        "signed_field_names": ",".join(ESEWA_SIGNED_FIELD_NAMES),
    }
    form_fields["signature"] = build_esewa_signature(
        build_esewa_message(ESEWA_SIGNED_FIELD_NAMES, form_fields),
        settings.ESEWA_SECRET_KEY,
    )
    return {
        "provider": Payment.GATEWAY_ESEWA,
        "environment": "uat" if settings.ESEWA_UAT_MODE else "production",
        "checkout_url": settings.ESEWA_FORM_URL,
        "form_fields": form_fields,
        "issued_at": timezone.now().isoformat(),
    }


def build_gateway_checkout_data(payment: Payment) -> dict:
    if payment.gateway == Payment.GATEWAY_ESEWA:
        return build_esewa_checkout_data(payment)

    gateway_url_map = {
        Payment.GATEWAY_KHALTI: "https://khalti.com/payment/",
        Payment.GATEWAY_CONNECT_IPS: "https://www.connectips.com/",
        Payment.GATEWAY_PAYU: "https://secure.payu.in/",
    }
    checkout_url = gateway_url_map.get(payment.gateway, "")
    return {
        "checkout_url": checkout_url,
        "external_ref": payment.external_ref,
        "amount": str(payment.amount),
        "issued_at": timezone.now().isoformat(),
    }


def decode_esewa_callback(encoded_data: str) -> dict:
    try:
        decoded = base64.b64decode(encoded_data).decode("utf-8")
        payload = json.loads(decoded)
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ValueError("Invalid eSewa callback payload.") from exc
    if not isinstance(payload, dict):
        raise ValueError("Invalid eSewa callback payload.")
    return payload


def verify_esewa_callback_signature(payload: dict) -> bool:
    signed_field_names = str(payload.get("signed_field_names", "")).split(",")
    field_names = [field_name.strip() for field_name in signed_field_names if field_name.strip()]
    signature = payload.get("signature")
    if not field_names or not signature:
        return False
    if any(field_name not in payload for field_name in field_names):
        return False
    expected = build_esewa_signature(build_esewa_message(field_names, payload), settings.ESEWA_SECRET_KEY)
    return hmac.compare_digest(signature, expected)


def check_esewa_transaction_status(payment: Payment) -> dict:
    query = urlencode(
        {
            "product_code": settings.ESEWA_PRODUCT_CODE,
            "total_amount": format_currency(payment.amount),
            "transaction_uuid": payment.external_ref,
        }
    )
    with urlopen(f"{settings.ESEWA_STATUS_CHECK_URL}?{query}", timeout=15) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("Invalid eSewa status response.")
    return payload


def get_item_producer_id(order_item: OrderItem) -> int:
    if order_item.product_type == OrderItem.PRODUCT_BEAT:
        return Beat.objects.values_list("producer_id", flat=True).get(id=order_item.product_id)
    if order_item.product_type == OrderItem.PRODUCT_SOUNDKIT:
        return SoundKit.objects.values_list("producer_id", flat=True).get(id=order_item.product_id)
    if order_item.product_type == OrderItem.PRODUCT_BUNDLE:
        return Bundle.objects.values_list("producer_id", flat=True).get(id=order_item.product_id)
    if order_item.product_type == OrderItem.PRODUCT_TAPE:
        return BeatTape.objects.values_list("producer_id", flat=True).get(id=order_item.product_id)
    raise ValueError("Invalid product type")


def mark_payment_failed(payment: Payment, *, reason: str = "", extra_metadata: dict | None = None):
    if payment.status == Payment.STATUS_SUCCESS:
        return

    metadata = dict(payment.metadata or {})
    if reason:
        metadata["failure_reason"] = reason
    if extra_metadata:
        metadata.update(extra_metadata)
    payment.metadata = metadata
    payment.status = Payment.STATUS_FAILED
    payment.save(update_fields=["metadata", "status"])

    order = payment.order
    order.status = Order.STATUS_FAILED
    order.save(update_fields=["status"])


def create_paid_entitlements(order: Order):
    for item in order.items.select_related("license_type"):
        if item.product_type != OrderItem.PRODUCT_BEAT or not item.license_type_id:
            continue
        beat = Beat.objects.get(id=item.product_id)
        PurchaseLicense.objects.get_or_create(
            buyer=order.buyer,
            beat=beat,
            license_type=item.license_type,
            order_item=item,
        )
        DownloadAccess.objects.get_or_create(
            buyer=order.buyer,
            beat=beat,
            order_item=item,
        )


def clear_paid_items_from_cart(order: Order):
    for item in order.items.select_related("license_type"):
        cart_item = CartItem.objects.filter(
            cart__buyer=order.buyer,
            product_type=item.product_type,
            product_id=item.product_id,
            license_type=item.license_type,
        ).first()
        if cart_item:
            cart = cart_item.cart
            cart_item.delete()
            cart.save(update_fields=["updated_at"])


@transaction.atomic
def settle_successful_payment(payment: Payment, *, verification_payload: dict | None = None):
    if payment.status == Payment.STATUS_SUCCESS:
        return

    if verification_payload:
        metadata = dict(payment.metadata or {})
        metadata["verification"] = verification_payload
        payment.metadata = metadata

    payment.status = Payment.STATUS_SUCCESS
    payment.save(update_fields=["metadata", "status"] if verification_payload else ["status"])

    order = payment.order
    order.status = Order.STATUS_PAID
    order.save(update_fields=["status"])

    create_paid_entitlements(order)
    clear_paid_items_from_cart(order)

    for item in order.items.all():
        producer_id = get_item_producer_id(item)
        wallet, _ = ProducerWallet.objects.get_or_create(producer_id=producer_id)
        producer_amount = item.price * (Decimal("1.00") - PLATFORM_COMMISSION_RATE)
        wallet.balance = wallet.balance + producer_amount
        wallet.save(update_fields=["balance", "updated_at"])
        WalletLedgerEntry.objects.create(
            wallet=wallet,
            payment=payment,
            amount=producer_amount,
            note=f"Settlement for order #{order.id}",
        )

    Transaction.objects.create(
        payment=payment,
        txn_type=Transaction.TYPE_SETTLEMENT,
        status=Payment.STATUS_SUCCESS,
        raw_payload={"order_id": order.id, "verification": verification_payload or {}},
    )
