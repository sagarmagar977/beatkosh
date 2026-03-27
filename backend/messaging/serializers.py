from rest_framework import serializers

from messaging.models import Conversation, Message, MessageAttachment


class MessageAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.FileField(source="file", read_only=True)

    class Meta:
        model = MessageAttachment
        fields = ("id", "url", "original_name", "content_type", "size", "uploaded_at")


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    files = serializers.ListField(child=serializers.FileField(), write_only=True, required=False)

    class Meta:
        model = Message
        fields = ("id", "conversation", "sender", "sender_username", "content", "attachments", "files", "timestamp")
        read_only_fields = ("sender", "timestamp")

    def validate(self, attrs):
        content = (attrs.get("content") or "").strip()
        files = attrs.get("files") or []
        if not content and not files:
            raise serializers.ValidationError("A message needs text or at least one attachment.")
        attrs["content"] = content
        return attrs

    def create(self, validated_data):
        uploaded_files = validated_data.pop("files", [])
        message = super().create(validated_data)
        attachments = [
            MessageAttachment(
                message=message,
                file=uploaded_file,
                original_name=uploaded_file.name,
                content_type=getattr(uploaded_file, "content_type", "") or "",
                size=getattr(uploaded_file, "size", 0) or 0,
            )
            for uploaded_file in uploaded_files
        ]
        if attachments:
            MessageAttachment.objects.bulk_create(attachments)
        return message


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    participant_details = serializers.SerializerMethodField()
    project_title = serializers.CharField(source="project.title", read_only=True)

    class Meta:
        model = Conversation
        fields = ("id", "participants", "participant_details", "project", "project_title", "messages", "created_at")

    def get_participant_details(self, obj):
        return [{"id": participant.id, "username": participant.username} for participant in obj.participants.all()]
