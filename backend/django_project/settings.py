import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-only-change-me",
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env_bool("DJANGO_DEBUG", True)

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS", "")
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", False)


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "drf_spectacular",
    "common",
    "accounts",
    "beats",
    "catalog",
    "orders",
    "payments",
    "projects",
    "messaging",
    "reviews",
    "verification",
    "analytics_app",
    "reference_hub",
    "resources_app",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "django_project.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "django_project.wsgi.application"


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

FORCE_SQLITE = env_bool("FORCE_SQLITE", False)
DATABASE_URL = os.getenv("DATABASE_URL")
DB_CONN_MAX_AGE = env_int("DB_CONN_MAX_AGE", 0)
if FORCE_SQLITE:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
elif DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=DB_CONN_MAX_AGE,
            ssl_require=env_bool("DJANGO_DB_SSL_REQUIRE", True),
        )
    }
elif os.getenv("POSTGRES_DB"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB"),
            "USER": os.getenv("POSTGRES_USER", "postgres"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", ""),
            "HOST": os.getenv("POSTGRES_HOST", "localhost"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = os.getenv("DJANGO_TIME_ZONE", "Asia/Kathmandu")

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_ROOT = BASE_DIR / "media"

IMAGEKIT_ENABLED = env_bool("IMAGEKIT_ENABLED", False)
IMAGEKIT_PUBLIC_KEY = os.getenv("IMAGEKIT_PUBLIC_KEY", "").strip()
IMAGEKIT_PRIVATE_KEY = os.getenv("IMAGEKIT_PRIVATE_KEY", "").strip()
IMAGEKIT_URL_ENDPOINT = os.getenv("IMAGEKIT_URL_ENDPOINT", "").strip().rstrip("/")
IMAGEKIT_MEDIA_ROOT = os.getenv("IMAGEKIT_MEDIA_ROOT", "BeatKosh").strip().strip("/") or "BeatKosh"

if IMAGEKIT_ENABLED and IMAGEKIT_URL_ENDPOINT:
    MEDIA_URL = f"{IMAGEKIT_URL_ENDPOINT}/{IMAGEKIT_MEDIA_ROOT}/"
else:
    MEDIA_URL = "/media/"

STORAGES = {
    "default": {
        "BACKEND": "common.storages.ImageKitStorage" if IMAGEKIT_ENABLED else "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip()

SPECTACULAR_SETTINGS = {
    "TITLE": "BeatKosh API",
    "DESCRIPTION": "Backend API for BeatKosh marketplace and collaboration platform.",
    "VERSION": "1.0.0",
}

PAYMENT_WEBHOOK_SECRETS = {
    "esewa": os.getenv("PAYMENT_WEBHOOK_SECRET_ESEWA", "local-esewa-secret"),
    "khalti": os.getenv("PAYMENT_WEBHOOK_SECRET_KHALTI", "local-khalti-secret"),
    "connectips": os.getenv("PAYMENT_WEBHOOK_SECRET_CONNECTIPS", "local-connectips-secret"),
    "payu": os.getenv("PAYMENT_WEBHOOK_SECRET_PAYU", "local-payu-secret"),
}

PAYMENT_FRONTEND_BASE_URL = os.getenv("PAYMENT_FRONTEND_BASE_URL", "http://127.0.0.1:3000").rstrip("/")
ESEWA_UAT_MODE = env_bool("ESEWA_UAT_MODE", True)
ESEWA_PRODUCT_CODE = os.getenv("ESEWA_PRODUCT_CODE", "EPAYTEST")
ESEWA_SECRET_KEY = os.getenv("ESEWA_SECRET_KEY", "8gBm/:&EnhH.1/q")
ESEWA_FORM_URL = os.getenv(
    "ESEWA_FORM_URL",
    "https://rc-epay.esewa.com.np/api/epay/main/v2/form" if ESEWA_UAT_MODE else "https://epay.esewa.com.np/api/epay/main/v2/form",
)
ESEWA_STATUS_CHECK_URL = os.getenv(
    "ESEWA_STATUS_CHECK_URL",
    "https://rc.esewa.com.np/api/epay/transaction/status/" if ESEWA_UAT_MODE else "https://esewa.com.np/api/epay/transaction/status/",
)

FFMPEG_BINARY = os.getenv("FFMPEG_BINARY", "ffmpeg")
AUDIO_PREVIEW_MAX_SECONDS = int(os.getenv("AUDIO_PREVIEW_MAX_SECONDS", "45"))
AUDIO_PREVIEW_BITRATE = os.getenv("AUDIO_PREVIEW_BITRATE", "128k")
