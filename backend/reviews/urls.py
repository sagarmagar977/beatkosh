from django.urls import path

from reviews.views import ProducerReviewListView, ReviewCreateView

def both(route: str, view, name: str):
    route = route.strip("/")
    if not route:
        return [path("", view, name=name)]
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]

urlpatterns = [
    *both("", ReviewCreateView.as_view(), "review-create"),
    *both("producer/<int:producer_id>", ProducerReviewListView.as_view(), "producer-reviews"),
]
