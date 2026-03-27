from collections import defaultdict

from rest_framework import serializers

from beats.models import Beat, LicenseType
from beats.serializers import BeatSerializer
from catalog.models import BeatTape, Bundle, SoundKit
from orders.models import Cart, CartItem, DownloadAccess, Order, OrderItem
from orders.services import cart_totals, resolve_product


def format_currency_amount(value):
    if value is None:
        return "0.00"
    return f"{value:,.2f}"


def build_cart_product_map(items):
    grouped_ids = defaultdict(set)
    for item in items:
        grouped_ids[item.product_type].add(item.product_id)

    product_map = {}
    if grouped_ids[CartItem.PRODUCT_BEAT]:
        for product in Beat.objects.filter(id__in=grouped_ids[CartItem.PRODUCT_BEAT], is_active=True).select_related("producer"):
            product_map[(CartItem.PRODUCT_BEAT, product.id)] = product
    if grouped_ids[CartItem.PRODUCT_SOUNDKIT]:
        for product in SoundKit.objects.filter(id__in=grouped_ids[CartItem.PRODUCT_SOUNDKIT], is_active=True).select_related("producer"):
            product_map[(CartItem.PRODUCT_SOUNDKIT, product.id)] = product
    if grouped_ids[CartItem.PRODUCT_BUNDLE]:
        for product in Bundle.objects.filter(id__in=grouped_ids[CartItem.PRODUCT_BUNDLE]).select_related("producer"):
            product_map[(CartItem.PRODUCT_BUNDLE, product.id)] = product
    if grouped_ids[CartItem.PRODUCT_TAPE]:
        for product in BeatTape.objects.filter(id__in=grouped_ids[CartItem.PRODUCT_TAPE]).select_related("producer"):
            product_map[(CartItem.PRODUCT_TAPE, product.id)] = product
    return product_map


class OrderItemInputSerializer(serializers.Serializer):
    product_type = serializers.ChoiceField(choices=OrderItem.PRODUCT_TYPE_CHOICES)
    product_id = serializers.IntegerField(min_value=1)
    license_id = serializers.IntegerField(required=False)

    def validate(self, attrs):
        if attrs["product_type"] == OrderItem.PRODUCT_BEAT and "license_id" not in attrs:
            raise serializers.ValidationError("license_id is required for beat purchases.")
        return attrs


class CartItemInputSerializer(serializers.Serializer):
    product_type = serializers.ChoiceField(choices=CartItem.PRODUCT_TYPE_CHOICES)
    product_id = serializers.IntegerField(min_value=1)
    license_id = serializers.IntegerField(required=False)

    def validate(self, attrs):
        if attrs["product_type"] == CartItem.PRODUCT_BEAT and "license_id" not in attrs:
            raise serializers.ValidationError("license_id is required for beat cart items.")
        return attrs


class CartItemUpdateSerializer(serializers.Serializer):
    license_id = serializers.IntegerField(required=False, allow_null=True)


class OrderCreateSerializer(serializers.Serializer):
    items = OrderItemInputSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one order item is required.")
        return value

    def create(self, validated_data):
        items = validated_data["items"]
        license_ids = [item.get("license_id") for item in items if item.get("license_id")]
        license_map = LicenseType.objects.in_bulk(license_ids)
        for item in items:
            license_id = item.pop("license_id", None)
            item["license_type"] = license_map.get(license_id) if license_id else None
        return self.context["create_order"](self.context["request"].user, items)


class OrderItemSerializer(serializers.ModelSerializer):
    license_name = serializers.CharField(source="license_type.name", read_only=True)
    price_display = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ("id", "product_type", "product_id", "product_title", "license_name", "price", "price_display")

    def get_price_display(self, obj):
        return format_currency_amount(obj.price)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ("id", "buyer", "total_price", "status", "items", "created_at")
        read_only_fields = ("buyer", "total_price", "status", "created_at")


class CartItemSerializer(serializers.ModelSerializer):
    license_name = serializers.CharField(source="license_type.name", read_only=True)
    product = serializers.SerializerMethodField()
    price_display = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ("id", "product_type", "product_id", "product_title", "license_name", "price", "price_display", "product")

    def get_price_display(self, obj):
        return format_currency_amount(obj.price)

    def get_product(self, obj):
        product_map = self.context.get("product_map", {})
        product = product_map.get((obj.product_type, obj.product_id))
        if product is None:
            product = resolve_product(obj.product_type, obj.product_id)
        if obj.product_type == CartItem.PRODUCT_BEAT:
            return {
                "id": product.id,
                "title": product.title,
                "producer_name": product.producer.username,
                "bpm": product.bpm,
                "cover_art_obj": product.cover_art_obj.url if product.cover_art_obj else "",
                "product_badge": "BEAT",
            }
        if obj.product_type == CartItem.PRODUCT_SOUNDKIT:
            return {
                "id": product.id,
                "title": product.title,
                "producer_name": product.producer.username,
                "bpm": None,
                "cover_art_obj": product.cover_art_obj.url if product.cover_art_obj else "",
                "product_badge": "SOUND",
            }
        return {
            "id": product.id,
            "title": product.title,
            "producer_name": getattr(product.producer, "username", ""),
            "bpm": None,
            "cover_art_obj": "",
            "product_badge": obj.product_type.upper(),
        }


class CartSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    beat_total = serializers.SerializerMethodField()
    beat_total_display = serializers.SerializerMethodField()
    soundkit_total = serializers.SerializerMethodField()
    soundkit_total_display = serializers.SerializerMethodField()
    discount_total = serializers.SerializerMethodField()
    discount_total_display = serializers.SerializerMethodField()
    platform_fee = serializers.SerializerMethodField()
    platform_fee_display = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    subtotal_display = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    total_display = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = (
            "id",
            "buyer",
            "items",
            "beat_total",
            "beat_total_display",
            "soundkit_total",
            "soundkit_total_display",
            "discount_total",
            "discount_total_display",
            "platform_fee",
            "platform_fee_display",
            "subtotal",
            "subtotal_display",
            "total",
            "total_display",
            "item_count",
            "updated_at",
        )
        read_only_fields = fields

    def get_items(self, obj):
        items = list(obj.items.select_related("license_type").order_by("created_at", "id"))
        return CartItemSerializer(items, many=True, context={**self.context, "product_map": build_cart_product_map(items)}).data

    def _totals(self, obj):
        totals_cache = getattr(self, "_totals_cache", None)
        if totals_cache is None:
            totals_cache = {}
            self._totals_cache = totals_cache
        if obj.pk not in totals_cache:
            totals_cache[obj.pk] = cart_totals(obj)
        return totals_cache[obj.pk]

    def get_beat_total(self, obj):
        return self._totals(obj)["beat_total"]

    def get_soundkit_total(self, obj):
        return self._totals(obj)["soundkit_total"]

    def get_beat_total_display(self, obj):
        return format_currency_amount(self._totals(obj)["beat_total"])

    def get_soundkit_total_display(self, obj):
        return format_currency_amount(self._totals(obj)["soundkit_total"])

    def get_discount_total(self, obj):
        return self._totals(obj)["discount_total"]

    def get_discount_total_display(self, obj):
        return format_currency_amount(self._totals(obj)["discount_total"])

    def get_platform_fee(self, obj):
        return self._totals(obj)["platform_fee"]

    def get_platform_fee_display(self, obj):
        return format_currency_amount(self._totals(obj)["platform_fee"])

    def get_subtotal(self, obj):
        return self._totals(obj)["subtotal"]

    def get_subtotal_display(self, obj):
        return format_currency_amount(self._totals(obj)["subtotal"])

    def get_total(self, obj):
        return self._totals(obj)["total"]

    def get_total_display(self, obj):
        return format_currency_amount(self._totals(obj)["total"])

    def get_item_count(self, obj):
        return self._totals(obj)["item_count"]


class DownloadAccessSerializer(serializers.ModelSerializer):
    beat = BeatSerializer(read_only=True)
    order_id = serializers.IntegerField(source="order_item.order_id", read_only=True)
    order_status = serializers.CharField(source="order_item.order.status", read_only=True)
    license_name = serializers.CharField(source="order_item.license_type.name", read_only=True)

    class Meta:
        model = DownloadAccess
        fields = ("id", "beat", "order_id", "order_status", "license_name", "granted_at")
