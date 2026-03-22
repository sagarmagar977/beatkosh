from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from beats.models import LicenseType
from orders.models import CartItem, DownloadAccess, Order
from orders.serializers import (
    CartItemInputSerializer,
    CartItemUpdateSerializer,
    CartSerializer,
    DownloadAccessSerializer,
    OrderCreateSerializer,
    OrderSerializer,
)
from orders.services import add_item_to_cart, checkout_cart, create_order_for_items, get_or_create_cart, update_cart_item


class OrderCreateView(generics.GenericAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request, "create_order": create_order_for_items},
        )
        serializer.is_valid(raise_exception=True)
        try:
            order = serializer.save()
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class CartMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart = get_or_create_cart(request.user)
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)


class CartItemCreateView(generics.GenericAPIView):
    serializer_class = CartItemInputSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        license_type = None
        if "license_id" in serializer.validated_data:
            license_type = LicenseType.objects.get(id=serializer.validated_data["license_id"])
        try:
            item, created = add_item_to_cart(
                request.user,
                product_type=serializer.validated_data["product_type"],
                product_id=serializer.validated_data["product_id"],
                license_type=license_type,
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        return Response(
            {
                "created": created,
                "message": "Beat added to cart successfully." if created else "Cart item updated successfully.",
                "cart": CartSerializer(item.cart).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CartItemDetailView(generics.GenericAPIView):
    serializer_class = CartItemUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, item_id: int):
        return CartItem.objects.select_related("cart", "license_type").get(id=item_id, cart__buyer=self.request.user)

    def patch(self, request, item_id: int):
        item = self.get_object(item_id)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        license_id = serializer.validated_data.get("license_id")
        if item.product_type == CartItem.PRODUCT_BEAT and not license_id:
            raise ValidationError({"license_id": "license_id is required for beat cart items."})
        license_type = LicenseType.objects.get(id=license_id) if license_id else None
        try:
            update_cart_item(item, license_type=license_type)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        return Response(CartSerializer(item.cart).data, status=status.HTTP_200_OK)

    def delete(self, request, item_id: int):
        item = self.get_object(item_id)
        cart = item.cart
        item.delete()
        cart.save(update_fields=["updated_at"])
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)


class CartCheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            order = checkout_cart(request.user)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(buyer=self.request.user).prefetch_related("items", "items__license_type")


class OrderHistoryView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects.filter(buyer=self.request.user)
            .prefetch_related("items", "items__license_type")
            .order_by("-created_at")
        )


class DownloadLibraryView(generics.ListAPIView):
    serializer_class = DownloadAccessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            DownloadAccess.objects.filter(buyer=self.request.user, order_item__order__status=Order.STATUS_PAID)
            .select_related("beat", "beat__producer", "order_item", "order_item__order", "order_item__license_type")
            .prefetch_related("beat__available_licenses")
            .order_by("-granted_at")
        )


class DownloadBeatHQUrlView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, beat_id: int):
        access = (
            DownloadAccess.objects.filter(
                buyer=request.user,
                beat_id=beat_id,
                order_item__order__status=Order.STATUS_PAID,
            )
            .select_related("beat")
            .first()
        )
        if not access:
            raise PermissionDenied("No paid download entitlement for this beat.")
        beat = access.beat
        if not beat.audio_file_obj:
            return Response({"detail": "HQ file unavailable for this beat."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            {
                "beat_id": beat.id,
                "download_url": beat.audio_file_obj.url,
                "filename": beat.audio_file_obj.name.split("/")[-1],
            },
            status=status.HTTP_200_OK,
        )
