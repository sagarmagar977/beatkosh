from rest_framework import serializers

from resources_app.models import FAQItem, ResourceArticle


class ResourceArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceArticle
        fields = (
            "id",
            "category",
            "title",
            "slug",
            "summary",
            "content",
            "is_published",
            "published_at",
            "updated_at",
        )
        read_only_fields = ("published_at", "updated_at")


class FAQItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQItem
        fields = ("id", "question", "answer", "order", "is_published", "created_at")
        read_only_fields = ("created_at",)
