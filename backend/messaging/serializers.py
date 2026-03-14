from rest_framework import serializers

from messaging.models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "conversation", "sender", "content", "attachments", "timestamp")
        read_only_fields = ("sender", "timestamp")


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ("id", "participants", "project", "messages", "created_at")

