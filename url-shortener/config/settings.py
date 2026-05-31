"""Django settings for the Rigbox url-shortener example.

Every tunable is read from the environment. The values are supplied by Rigbox
params (see rig.yaml) which the platform validates server-side before injecting
them as the env vars referenced here.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# DATA_DIR lives outside the synced app dir, so the SQLite DB survives redeploys.
DATA_DIR = Path(os.environ.get("DATA_DIR", "/home/developer/data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Runs behind the Rigbox gateway; the host header is the public domain, not ours.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "rigbox-example-insecure-key")
DEBUG = False
ALLOWED_HOSTS = ["*"]
CSRF_TRUSTED_ORIGINS = ["https://*.rigbox.dev"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "shortener",
]

MIDDLEWARE = [
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.middleware.common.CommonMiddleware",
]

STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(DATA_DIR / "db.sqlite3"),
    }
}

STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "shortener" / "static"]
STATIC_ROOT = str(DATA_DIR / "staticfiles")

DEFAULT_AUTO_FIELD = "django.db.models.AutoField"


def _as_bool(raw: str) -> bool:
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


# --- Rigbox params, read from the env (see rig.yaml) -------------------------
APP_CONFIG = {
    "site_name": os.environ.get("SITE_NAME", "Tiny Links"),
    "default_redirect_url": os.environ.get(
        "DEFAULT_REDIRECT_URL", "https://rigbox.dev"
    ),
    "max_links": int(os.environ.get("MAX_LINKS", "100")),
    "require_https": _as_bool(os.environ.get("REQUIRE_HTTPS", "false")),
    "id_strategy": os.environ.get("ID_STRATEGY", "random"),
    "admin_email": os.environ.get("ADMIN_EMAIL", "admin@example.com"),
    "admin_token": os.environ.get("ADMIN_TOKEN", ""),
    "welcome_message": os.environ.get(
        "WELCOME_MESSAGE",
        "Paste a long URL and get a short code. Links persist across redeploys.",
    ),
}
