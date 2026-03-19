from django.urls import path

from orders.views import (
    CartCheckoutView,
    CartItemCreateView,
    CartItemDetailView,
    CartMeView,
    DownloadBeatHQUrlView,
    DownloadLibraryView,
    OrderCreateView,
    OrderDetailView,
    OrderHistoryView,
)


def both(route: str, view, name: str):
    route = route.strip("/")
    return [
        path(route, view, name=f"{name}-noslash"),
        path(f"{route}/", view, name=name),
    ]


urlpatterns = [
    *both("cart/me", CartMeView.as_view(), "cart-me"),
    *both("cart/items", CartItemCreateView.as_view(), "cart-item-create"),
    *both("cart/items/<int:item_id>", CartItemDetailView.as_view(), "cart-item-detail"),
    *both("cart/checkout", CartCheckoutView.as_view(), "cart-checkout"),
    *both("create", OrderCreateView.as_view(), "order-create"),
    *both("history", OrderHistoryView.as_view(), "order-history"),
    *both("downloads", DownloadLibraryView.as_view(), "order-download-library"),
    *both("downloads/<int:beat_id>/hq-url", DownloadBeatHQUrlView.as_view(), "order-download-hq-url"),
    *both("<int:pk>", OrderDetailView.as_view(), "order-detail"),
]
