from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/docs/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("api/v1", include("common.urls")),
    path("api/v1/", include("common.urls")),
    path("api/v1/account", include("accounts.urls")),
    path("api/v1/account/", include("accounts.urls")),
    path("api/v1/beats", include("beats.urls")),
    path("api/v1/beats/", include("beats.urls")),
    path("api/v1", include("catalog.urls")),
    path("api/v1/", include("catalog.urls")),
    path("api/v1/orders", include("orders.urls")),
    path("api/v1/orders/", include("orders.urls")),
    path("api/v1/payments", include("payments.urls")),
    path("api/v1/payments/", include("payments.urls")),
    path("api/v1/projects", include("projects.urls")),
    path("api/v1/projects/", include("projects.urls")),
    path("api/v1", include("messaging.urls")),
    path("api/v1/", include("messaging.urls")),
    path("api/v1/reviews", include("reviews.urls")),
    path("api/v1/reviews/", include("reviews.urls")),
    path("api/v1/verification", include("verification.urls")),
    path("api/v1/verification/", include("verification.urls")),
    path("api/v1/analytics", include("analytics_app.urls")),
    path("api/v1/analytics/", include("analytics_app.urls")),
    path("api/v1/reference", include("reference_hub.urls")),
    path("api/v1/reference/", include("reference_hub.urls")),
    path("api/v1/resources", include("resources_app.urls")),
    path("api/v1/resources/", include("resources_app.urls")),
]

# Dev-only: serve uploaded media via Django when DEBUG=True and uploads are still local.
if settings.DEBUG and not settings.IMAGEKIT_ENABLED:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
