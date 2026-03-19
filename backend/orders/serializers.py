from rest_framework import serializers

from beats.models import LicenseType
from beats.serializers import BeatSerializer
from orders.models import Cart, CartItem, DownloadAccess, Order, OrderItem
from orders.services import cart_totals, resolve_product


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
        for item in items:
            license_id = item.pop("license_id", None)
            item["license_type"] = LicenseType.objects.get(id=license_id) if license_id else None
        return self.context["create_order"](self.context["request"].user, items)


class OrderItemSerializer(serializers.ModelSerializer):
    license_name = serializers.CharField(source="license_type.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "product_type", "product_id", "product_title", "license_name", "price")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ("id", "buyer", "total_price", "status", "items", "created_at")
        read_only_fields = ("buyer", "total_price", "status", "created_at")


class CartItemSerializer(serializers.ModelSerializer):
    license_name = serializers.CharField(source="license_type.name", read_only=True)
    product = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ("id", "product_type", "product_id", "product_title", "license_name", "price", "product")

    def get_product(self, obj):
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
    items = CartItemSerializer(many=True, read_only=True)
    beat_total = serializers.SerializerMethodField()
    soundkit_total = serializers.SerializerMethodField()
    discount_total = serializers.SerializerMethodField()
    platform_fee = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = (
            "id",
            "buyer",
            "items",
            "beat_total",
            "soundkit_total",
            "discount_total",
            "platform_fee",
            "subtotal",
            "total",
            "item_count",
            "updated_at",
        )
        read_only_fields = fields

    def _totals(self, obj):
        return cart_totals(obj)

    def get_beat_total(self, obj):
        return self._totals(obj)["beat_total"]

    def get_soundkit_total(self, obj):
        return self._totals(obj)["soundkit_total"]

    def get_discount_total(self, obj):
        return self._totals(obj)["discount_total"]

    def get_platform_fee(self, obj):
        return self._totals(obj)["platform_fee"]

    def get_subtotal(self, obj):
        return self._totals(obj)["subtotal"]

    def get_total(self, obj):
        return self._totals(obj)["total"]

    def get_item_count(self, obj):
        return self._totals(obj)["item_count"]


class DownloadAccessSerializer(serializers.ModelSerializer):
    beat = BeatSerializer(read_only=True)
    order_id = serializers.IntegerField(source="order_item.order_id", read_only=True)
    order_status = serializers.CharField(source="order_item.order.status", read_only=True)

    class Meta:
        model = DownloadAccess
        fields = ("id", "beat", "order_id", "order_status", "granted_at")
