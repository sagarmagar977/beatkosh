from django.urls import path

from resources_app.views import FAQListView, ResourceArticleDetailView, ResourceArticleListView


def both(route: str, view, name: str):
    route = route.strip("/")
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]


urlpatterns = [
    *both("articles", ResourceArticleListView.as_view(), "resource-article-list"),
    *both("articles/<slug:slug>", ResourceArticleDetailView.as_view(), "resource-article-detail"),
    *both("faq", FAQListView.as_view(), "resource-faq-list"),
]
