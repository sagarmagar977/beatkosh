from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ArtistProfile, ProducerProfile
from common.permissions import IsAdminUser
from verification.models import VerificationRequest
from verification.serializers import VerificationDecisionSerializer, VerificationRequestSerializer


class VerificationRequestCreateView(generics.CreateAPIView):
    serializer_class = VerificationRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class VerificationMeListView(generics.ListAPIView):
    serializer_class = VerificationRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return VerificationRequest.objects.filter(user=self.request.user).order_by("-created_at")


class VerificationDecisionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, request_id: int):
        verification_request = VerificationRequest.objects.get(id=request_id)
        serializer = VerificationDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        decision = serializer.validated_data["decision"]
        verification_request.status = decision
        if decision == VerificationRequest.STATUS_APPROVED:
            verification_request.approved_by = request.user
            verification_request.approved_at = timezone.now()
            if verification_request.verification_type == VerificationRequest.TYPE_ARTIST:
                profile, _ = ArtistProfile.objects.get_or_create(user=verification_request.user)
                profile.verified = True
                profile.save(update_fields=["verified"])
            if verification_request.verification_type == VerificationRequest.TYPE_PRODUCER:
                profile, _ = ProducerProfile.objects.get_or_create(user=verification_request.user)
                profile.verified = True
                profile.save(update_fields=["verified"])
        verification_request.save(update_fields=["status", "approved_by", "approved_at"])
        return Response({"id": verification_request.id, "status": verification_request.status}, status=status.HTTP_200_OK)
