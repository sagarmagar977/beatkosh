from rest_framework import generics, permissions

from resources_app.models import FAQItem, ResourceArticle
from resources_app.serializers import FAQItemSerializer, ResourceArticleSerializer


class ResourceArticleListView(generics.ListAPIView):
    serializer_class = ResourceArticleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = ResourceArticle.objects.filter(is_published=True)
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)
        return queryset


class ResourceArticleDetailView(generics.RetrieveAPIView):
    serializer_class = ResourceArticleSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return ResourceArticle.objects.filter(is_published=True)


class FAQListView(generics.ListAPIView):
    serializer_class = FAQItemSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return FAQItem.objects.filter(is_published=True)
