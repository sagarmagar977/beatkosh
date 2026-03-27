from django.db.models import Max
from django.db.models.functions import Coalesce
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from messaging.models import Conversation, Message
from messaging.serializers import ConversationSerializer, MessageSerializer


class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user).select_related("project").prefetch_related(
            "participants",
            "messages",
            "messages__sender",
            "messages__attachments",
        ).annotate(
            latest_activity=Coalesce(Max("messages__timestamp"), "created_at"),
        ).order_by("-latest_activity", "-created_at")


class MessageCreateView(generics.CreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        conversation = serializer.validated_data["conversation"]
        if not conversation.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("You are not a participant in this conversation.")
        serializer.save(sender=self.request.user)
