from decimal import Decimal

from django.db import transaction

from beats.models import Beat
from catalog.models import BeatTape, Bundle, SoundKit
from orders.models import DownloadAccess, Order, OrderItem, PurchaseLicense


def resolve_product_and_price(product_type: str, product_id: int):
    if product_type == OrderItem.PRODUCT_BEAT:
        beat = Beat.objects.get(id=product_id, is_active=True)
        return beat.title, beat.base_price, beat.producer_id
    if product_type == OrderItem.PRODUCT_SOUNDKIT:
        sound_kit = SoundKit.objects.get(id=product_id, is_active=True)
        return sound_kit.title, sound_kit.base_price, sound_kit.producer_id
    if product_type == OrderItem.PRODUCT_BUNDLE:
        bundle = Bundle.objects.get(id=product_id)
        return bundle.title, bundle.price, bundle.producer_id
    if product_type == OrderItem.PRODUCT_TAPE:
        tape = BeatTape.objects.get(id=product_id)
        return tape.title, tape.price, tape.producer_id
    raise ValueError("Invalid product_type")


@transaction.atomic
def create_order_for_items(buyer, items_data):
    order = Order.objects.create(buyer=buyer, total_price=Decimal("0.00"))
    total = Decimal("0.00")

    for item in items_data:
        title, price, _ = resolve_product_and_price(item["product_type"], item["product_id"])
        order_item = OrderItem.objects.create(
            order=order,
            product_type=item["product_type"],
            product_id=item["product_id"],
            product_title=title,
            license_type=item.get("license_type"),
            price=price,
        )
        total += price

        if item["product_type"] == OrderItem.PRODUCT_BEAT and item.get("license_type"):
            beat = Beat.objects.get(id=item["product_id"])
            PurchaseLicense.objects.create(
                buyer=buyer,
                beat=beat,
                license_type=item["license_type"],
                order_item=order_item,
            )
            DownloadAccess.objects.create(buyer=buyer, beat=beat, order_item=order_item)

    order.total_price = total
    order.save(update_fields=["total_price"])
    return order
