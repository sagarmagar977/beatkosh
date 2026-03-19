from decimal import Decimal

from django.db import transaction

from beats.models import Beat, LicenseType
from catalog.models import BeatTape, Bundle, SoundKit
from orders.models import Cart, CartItem, DownloadAccess, Order, OrderItem, PurchaseLicense


def resolve_product(product_type: str, product_id: int):
    if product_type == OrderItem.PRODUCT_BEAT:
        return Beat.objects.get(id=product_id, is_active=True)
    if product_type == OrderItem.PRODUCT_SOUNDKIT:
        return SoundKit.objects.get(id=product_id, is_active=True)
    if product_type == OrderItem.PRODUCT_BUNDLE:
        return Bundle.objects.get(id=product_id)
    if product_type == OrderItem.PRODUCT_TAPE:
        return BeatTape.objects.get(id=product_id)
    raise ValueError("Invalid product_type")


def resolve_product_and_price(product_type: str, product_id: int, license_type: LicenseType | None = None):
    product = resolve_product(product_type, product_id)
    if product_type == OrderItem.PRODUCT_BEAT:
        beat = product
        if license_type and license_type.is_exclusive:
            price = beat.exclusive_license_fee or beat.base_price
        elif license_type and license_type.includes_stems:
            price = beat.non_exclusive_stems_fee or beat.base_price
        elif license_type:
            price = beat.non_exclusive_wav_fee or beat.base_price
        else:
            price = beat.base_price
        return beat, beat.title, price, beat.producer_id
    if product_type == OrderItem.PRODUCT_SOUNDKIT:
        return product, product.title, product.base_price, product.producer_id
    if product_type == OrderItem.PRODUCT_BUNDLE:
        return product, product.title, product.price, product.producer_id
    if product_type == OrderItem.PRODUCT_TAPE:
        return product, product.title, product.price, product.producer_id
    raise ValueError("Invalid product_type")


def get_or_create_cart(buyer):
    cart, _ = Cart.objects.get_or_create(buyer=buyer)
    return cart


@transaction.atomic
def add_item_to_cart(buyer, *, product_type: str, product_id: int, license_type: LicenseType | None = None):
    cart = get_or_create_cart(buyer)
    _product, title, price, _producer_id = resolve_product_and_price(product_type, product_id, license_type)
    item = CartItem.objects.filter(
        cart=cart,
        product_type=product_type,
        product_id=product_id,
        license_type=license_type,
    ).first()
    if item:
        item.product_title = title
        item.price = price
        item.save(update_fields=["product_title", "price", "updated_at"])
        return item, False
    item = CartItem.objects.create(
        cart=cart,
        product_type=product_type,
        product_id=product_id,
        product_title=title,
        license_type=license_type,
        price=price,
    )
    cart.save(update_fields=["updated_at"])
    return item, True


@transaction.atomic
def update_cart_item(item: CartItem, *, license_type: LicenseType | None = None):
    _product, title, price, _producer_id = resolve_product_and_price(item.product_type, item.product_id, license_type)
    item.license_type = license_type
    item.product_title = title
    item.price = price
    item.save(update_fields=["license_type", "product_title", "price", "updated_at"])
    item.cart.save(update_fields=["updated_at"])
    return item


def cart_totals(cart: Cart):
    items = list(cart.items.select_related("license_type"))
    beat_total = sum((item.price for item in items if item.product_type == CartItem.PRODUCT_BEAT), Decimal("0.00"))
    soundkit_total = sum((item.price for item in items if item.product_type == CartItem.PRODUCT_SOUNDKIT), Decimal("0.00"))
    discount_total = Decimal("0.00")
    subtotal = beat_total + soundkit_total
    platform_fee = Decimal("0.00")
    total = subtotal + platform_fee - discount_total
    return {
        "beat_total": beat_total,
        "soundkit_total": soundkit_total,
        "discount_total": discount_total,
        "platform_fee": platform_fee,
        "subtotal": subtotal,
        "total": total,
        "item_count": len(items),
    }


@transaction.atomic
def create_order_for_items(buyer, items_data):
    order = Order.objects.create(buyer=buyer, total_price=Decimal("0.00"))
    total = Decimal("0.00")

    for item in items_data:
        product, title, price, _producer_id = resolve_product_and_price(
            item["product_type"], item["product_id"], item.get("license_type")
        )
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
            PurchaseLicense.objects.create(
                buyer=buyer,
                beat=product,
                license_type=item["license_type"],
                order_item=order_item,
            )
            DownloadAccess.objects.create(buyer=buyer, beat=product, order_item=order_item)

    order.total_price = total
    order.save(update_fields=["total_price"])
    return order


@transaction.atomic
def checkout_cart(buyer):
    cart = get_or_create_cart(buyer)
    cart_items = list(cart.items.select_related("license_type"))
    if not cart_items:
        raise ValueError("Cart is empty.")
    order = create_order_for_items(
        buyer,
        [
            {
                "product_type": item.product_type,
                "product_id": item.product_id,
                "license_type": item.license_type,
            }
            for item in cart_items
        ],
    )
    cart.items.all().delete()
    cart.save(update_fields=["updated_at"])
    return order
