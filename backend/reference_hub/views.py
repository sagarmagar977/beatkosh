import mimetypes
from pathlib import Path
from typing import Any

from django.conf import settings
from django.http import FileResponse, Http404
from django.utils.text import slugify
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class Beat22ReferenceService:
    BASE = Path(settings.BASE_DIR) / "reference resource" / "beat22"
    ROLES = ("artist", "producer")

    CATEGORY_RULES = {
        "dashboard": ("dashboard", "dashbaord", "dashabiord", "lsitening"),
        "discovery": ("browse", "search", "trending", "recently", "follower"),
        "commerce": ("cart", "beat button", "download", "liked", "track info", "related"),
        "resources": ("resource", "blog", "tutorial", "help desk", "faq"),
        "account": ("account", "setting", "billing", "user icon", "notification", "subscription", "payout"),
        "onboarding": ("start selling", "kyc", "seller aggre", "setup", "control", "pro plan"),
        "upload": ("upload", "uoload", "uplaod", "metada", "license", "kit"),
    }
    FEATURE_MAP = {
        "artist": [
            {
                "key": "artist_dashboard",
                "title": "Artist Dashboard and Home Feed",
                "status": "in_progress",
                "frontend_route": "/artist/studio",
                "backend_dependencies": ["/api/v1/beats/", "/api/v1/orders/create/", "/api/v1/verification/me/"],
            },
            {
                "key": "discovery_and_search",
                "title": "Search, Trending, Related Tracks",
                "status": "live",
                "frontend_route": "/beats",
                "backend_dependencies": ["/api/v1/beats/", "/api/v1/beats/trending/"],
            },
            {
                "key": "download_history_and_library",
                "title": "Downloads, Liked, Recently Played",
                "status": "live",
                "frontend_route": "/library",
                "backend_dependencies": [
                    "/api/v1/orders/history/",
                    "/api/v1/orders/downloads/",
                    "/api/v1/analytics/listening/recent/",
                    "/api/v1/analytics/listening/play/",
                ],
            },
            {
                "key": "resources_help_blog",
                "title": "Resources, Tutorials, Blog, FAQ",
                "status": "live",
                "frontend_route": "/resources",
                "backend_dependencies": ["/api/v1/resources/articles/", "/api/v1/resources/faq/"],
            },
            {
                "key": "social_activity_feed",
                "title": "Follows, Likes, and Drops Feed",
                "status": "live",
                "frontend_route": "/activity",
                "backend_dependencies": [
                    "/api/v1/account/follows/me/",
                    "/api/v1/account/likes/beats/me/",
                    "/api/v1/analytics/drops/feed/",
                ],
            },
        ],
        "producer": [
            {
                "key": "producer_dashboard",
                "title": "Producer Studio Dashboard",
                "status": "in_progress",
                "frontend_route": "/producer/profile",
                "backend_dependencies": ["/api/v1/beats/", "/api/v1/payments/wallet/me/"],
            },
            {
                "key": "upload_wizard",
                "title": "Upload: Media, Metadata, License",
                "status": "live",
                "frontend_route": "/producer/upload-wizard",
                "backend_dependencies": [
                    "/api/v1/beats/upload-drafts/",
                    "/api/v1/beats/upload-drafts/{id}/",
                    "/api/v1/beats/upload-drafts/{id}/publish/",
                    "/api/v1/beats/licenses/",
                ],
            },
            {
                "key": "kyc_and_seller_agreement",
                "title": "KYC, Seller Agreement, Studio Setup",
                "status": "planned",
                "frontend_route": "/verification",
                "backend_dependencies": ["/api/v1/verification/requests/"],
            },
            {
                "key": "subscription_and_payout",
                "title": "Pro Plan, Subscription, Payout Settings",
                "status": "live",
                "frontend_route": "/producer/settings",
                "backend_dependencies": [
                    "/api/v1/payments/plans/",
                    "/api/v1/payments/subscription/me/",
                    "/api/v1/payments/payout-profile/me/",
                ],
            },
        ],
    }

    @classmethod
    def _pretty_title(cls, filename: str) -> str:
        stem = Path(filename).stem
        cleaned = stem.replace("_", " ").replace("-", " ").strip()
        return " ".join(part.capitalize() for part in cleaned.split())

    @classmethod
    def _category_for_name(cls, filename: str) -> str:
        lowered = filename.lower()
        for category, hints in cls.CATEGORY_RULES.items():
            if any(hint in lowered for hint in hints):
                return category
        return "general"

    @classmethod
    def _tags_for(cls, role: str, filename: str) -> list[str]:
        base_tags = [role, cls._category_for_name(filename)]
        lowered = filename.lower()
        if "button" in lowered:
            base_tags.append("ui-control")
        if "page" in lowered:
            base_tags.append("full-screen")
        if "upload" in lowered:
            base_tags.append("producer-tools")
        if "dashboard" in lowered or "dashbaord" in lowered:
            base_tags.append("dashboard")
        return sorted(set(base_tags))

    @classmethod
    def list_screens(cls, role: str) -> list[dict[str, Any]]:
        if role not in cls.ROLES:
            return []
        role_dir = cls.BASE / role
        if not role_dir.exists():
            return []

        rows: list[dict[str, Any]] = []
        seen_slugs: dict[str, int] = {}
        for index, path in enumerate(sorted(role_dir.glob("*")), start=1):
            if not path.is_file():
                continue
            suffix = path.suffix.lower()
            if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
                continue

            raw_slug = slugify(path.stem)
            if not raw_slug:
                raw_slug = f"screen-{index}"
            count = seen_slugs.get(raw_slug, 0) + 1
            seen_slugs[raw_slug] = count
            slug = raw_slug if count == 1 else f"{raw_slug}-{count}"

            rows.append(
                {
                    "id": index,
                    "slug": slug,
                    "role": role,
                    "title": cls._pretty_title(path.name),
                    "file_name": path.name,
                    "category": cls._category_for_name(path.name),
                    "tags": cls._tags_for(role, path.name),
                    "relative_path": str(path.relative_to(settings.BASE_DIR)).replace("\\", "/"),
                    "image_url": f"/api/v1/reference/beat22/{role}/{slug}/image/",
                }
            )
        return rows

    @classmethod
    def get_screen_by_slug(cls, role: str, slug: str) -> tuple[dict[str, Any], Path]:
        screens = cls.list_screens(role)
        for screen in screens:
            if screen["slug"] == slug:
                full_path = Path(settings.BASE_DIR) / screen["relative_path"]
                return screen, full_path
        raise Http404("Reference screen not found")

    @classmethod
    def summary(cls) -> dict[str, Any]:
        artist_screens = cls.list_screens("artist")
        producer_screens = cls.list_screens("producer")

        all_screens = artist_screens + producer_screens
        categories: dict[str, int] = {}
        for item in all_screens:
            categories[item["category"]] = categories.get(item["category"], 0) + 1

        return {
            "reference_name": "Beat22",
            "reference_root": "reference resource/beat22",
            "roles": {
                "artist": {
                    "screen_count": len(artist_screens),
                    "screens": artist_screens,
                },
                "producer": {
                    "screen_count": len(producer_screens),
                    "screens": producer_screens,
                },
            },
            "totals": {
                "screens": len(all_screens),
                "categories": categories,
            },
            "recommended_frontend_tracks": [
                "artist-dashboard-and-discovery",
                "producer-studio-upload-flow",
                "resource-center-and-blog",
                "settings-verification-payout",
            ],
            "recommended_backend_tracks": [
                "upload-metadata-license-wizard",
                "download-history-and-library",
                "notifications-follow-activity",
                "subscription-and-pro-plan-controls",
            ],
            "feature_map": cls.FEATURE_MAP,
        }


class Beat22ReferenceSummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(Beat22ReferenceService.summary())


class Beat22ReferenceImageView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, role: str, slug: str):
        _screen, file_path = Beat22ReferenceService.get_screen_by_slug(role, slug)
        if not file_path.exists() or not file_path.is_file():
            raise Http404("Image not found")
        content_type, _encoding = mimetypes.guess_type(str(file_path))
        return FileResponse(file_path.open("rb"), content_type=content_type or "application/octet-stream")
