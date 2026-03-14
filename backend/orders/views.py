from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import DownloadAccess, Order
from orders.serializers import DownloadAccessSerializer, OrderCreateSerializer, OrderSerializer
from orders.services import create_order_for_items


class OrderCreateView(generics.GenericAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request, "create_order": create_order_for_items},
        )
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
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
            .select_related("beat", "beat__producer", "order_item", "order_item__order")
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
