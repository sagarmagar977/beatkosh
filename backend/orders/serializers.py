from rest_framework import serializers

from beats.models import LicenseType
from beats.serializers import BeatSerializer
from orders.models import DownloadAccess, Order, OrderItem


class OrderItemInputSerializer(serializers.Serializer):
    product_type = serializers.ChoiceField(choices=OrderItem.PRODUCT_TYPE_CHOICES)
    product_id = serializers.IntegerField(min_value=1)
    license_id = serializers.IntegerField(required=False)

    def validate(self, attrs):
        if attrs["product_type"] == OrderItem.PRODUCT_BEAT and "license_id" not in attrs:
            raise serializers.ValidationError("license_id is required for beat purchases.")
        return attrs


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


class DownloadAccessSerializer(serializers.ModelSerializer):
    beat = BeatSerializer(read_only=True)
    order_id = serializers.IntegerField(source="order_item.order_id", read_only=True)
    order_status = serializers.CharField(source="order_item.order.status", read_only=True)

    class Meta:
        model = DownloadAccess
        fields = ("id", "beat", "order_id", "order_status", "granted_at")
