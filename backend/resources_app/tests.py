from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from resources_app.models import FAQItem, ResourceArticle


class ResourcesApiTests(APITestCase):
    def setUp(self):
        self.article = ResourceArticle.objects.create(
            category=ResourceArticle.CATEGORY_BLOG,
            title="How to license beats",
            slug="how-to-license-beats",
            summary="Licensing basics for artists.",
            content="Long-form content.",
            is_published=True,
        )
        FAQItem.objects.create(
            question="How do I download purchased beats?",
            answer="Go to library and open downloads.",
            order=1,
            is_published=True,
        )

    def test_resource_article_list(self):
        response = self.client.get(reverse("resource-article-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_resource_article_detail(self):
        response = self.client.get(
            reverse("resource-article-detail", kwargs={"slug": self.article.slug})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["slug"], self.article.slug)

    def test_resource_faq_list(self):
        response = self.client.get(reverse("resource-faq-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
