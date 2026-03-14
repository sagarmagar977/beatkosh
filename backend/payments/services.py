from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from beats.models import Beat
from catalog.models import BeatTape, Bundle
from orders.models import Order, OrderItem
from payments.models import Payment, ProducerWallet, Transaction, WalletLedgerEntry

PLATFORM_COMMISSION_RATE = Decimal("0.10")


def build_gateway_checkout_data(payment: Payment) -> dict:
    # Gateway URLs are configurable placeholders that allow environment-specific callback setup.
    gateway_url_map = {
        Payment.GATEWAY_ESEWA: "https://esewa.com.np/epay/main",
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


def get_item_producer_id(order_item: OrderItem) -> int:
    if order_item.product_type == OrderItem.PRODUCT_BEAT:
        return Beat.objects.values_list("producer_id", flat=True).get(id=order_item.product_id)
    if order_item.product_type == OrderItem.PRODUCT_BUNDLE:
        return Bundle.objects.values_list("producer_id", flat=True).get(id=order_item.product_id)
    if order_item.product_type == OrderItem.PRODUCT_TAPE:
        return BeatTape.objects.values_list("producer_id", flat=True).get(id=order_item.product_id)
    raise ValueError("Invalid product type")


@transaction.atomic
def settle_successful_payment(payment: Payment):
    if payment.status == Payment.STATUS_SUCCESS:
        return

    payment.status = Payment.STATUS_SUCCESS
    payment.save(update_fields=["status"])

    order = payment.order
    order.status = Order.STATUS_PAID
    order.save(update_fields=["status"])

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
        raw_payload={"order_id": order.id},
    )
