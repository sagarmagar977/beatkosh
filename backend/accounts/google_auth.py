import re

import jwt
from django.conf import settings
from rest_framework.exceptions import ValidationError

GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ("https://accounts.google.com", "accounts.google.com")


def verify_google_id_token(token: str) -> dict:
    client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "").strip()
    if not client_id:
        raise ValidationError("Google sign-in is not configured on the server.")

    if not token.strip():
        raise ValidationError("Google credential is required.")

    try:
        signing_key = jwt.PyJWKClient(GOOGLE_JWKS_URL).get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=client_id,
        )
    except Exception as exc:
        detail = f"Google sign-in could not be verified: {exc}" if settings.DEBUG else "Google sign-in could not be verified."
        raise ValidationError(detail) from exc

    issuer = str(payload.get("iss", "")).strip()
    if issuer not in GOOGLE_ISSUERS:
        raise ValidationError("Google token issuer is invalid.")

    email = str(payload.get("email", "")).strip().lower()
    sub = str(payload.get("sub", "")).strip()
    if not email or not sub:
        raise ValidationError("Google account response is missing required fields.")
    if not payload.get("email_verified", False):
        raise ValidationError("Google email must be verified before sign-in.")

    return payload


def build_unique_username(email: str, fallback_name: str = "") -> str:
    from django.contrib.auth import get_user_model

    User = get_user_model()

    candidates = [
        re.sub(r"[^a-z0-9_]+", "", email.split("@", 1)[0].lower()),
        re.sub(r"[^a-z0-9_]+", "", fallback_name.lower().replace(" ", "_")),
        "google_user",
    ]
    base = next((value[:150] for value in candidates if value), "google_user")
    username = base
    suffix = 1

    while User.objects.filter(username=username).exists():
        suffix += 1
        tail = str(suffix)
        username = f"{base[:150 - len(tail)]}{tail}"

    return username
