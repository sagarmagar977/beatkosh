from rest_framework import serializers

from verification.models import VerificationRequest


class VerificationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationRequest
        fields = (
            "id",
            "user",
            "verification_type",
            "status",
            "submitted_documents",
            "approved_by",
            "approved_at",
            "created_at",
        )
        read_only_fields = ("user", "status", "approved_by", "approved_at", "created_at")


class VerificationDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=[("approved", "approved"), ("rejected", "rejected")])
