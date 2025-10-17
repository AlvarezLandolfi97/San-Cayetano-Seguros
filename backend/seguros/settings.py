import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# === BASE DIR ===
BASE_DIR = Path(__file__).resolve().parent.parent
# Cargar variables desde backend/.env
load_dotenv(BASE_DIR.parent / ".env")

# === HELPERS ===
def _bool(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in ("1", "true", "t", "yes", "y", "on")


# === CORE ===
SECRET_KEY = (
    os.getenv("DJANGO_SECRET_KEY")
    or os.getenv("SECRET_KEY")
    or "dev-secret-key-change-me"
)

DEBUG = _bool(os.getenv("DJANGO_DEBUG") or os.getenv("DEBUG"), True)

# Hosts permitidos
_hosts_env = os.getenv("DJANGO_ALLOWED_HOSTS") or os.getenv(
    "ALLOWED_HOSTS", "localhost,127.0.0.1"
)
ALLOWED_HOSTS = (
    ["*"]
    if "*" in _hosts_env
    else [h.strip() for h in _hosts_env.split(",") if h.strip()]
)

# === INSTALLED APPS ===
INSTALLED_APPS = [
    # Django apps
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Terceros
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",

    # Apps locales
    "accounts",
    "vehicles",
    "products",
    "inspections",
    "policies",
    "payments",
    "quotes",
]

# === MIDDLEWARE ===
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # CORS alto y antes de Common
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# === CORS / CSRF ===
_frontend_env = os.getenv("FRONTEND_ORIGINS") or os.getenv(
    "FRONTEND_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173"
)
CORS_ALLOWED_ORIGINS = [o.strip() for o in _frontend_env.split(",") if o.strip()]
CORS_ALLOW_CREDENTIALS = _bool(os.getenv("CORS_ALLOW_CREDENTIALS"), False)

# En dev: si no hay orígenes declarados, permite todos
if DEBUG and not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = []
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False

CSRF_TRUSTED_ORIGINS = [
    o for o in CORS_ALLOWED_ORIGINS if o.startswith(("http://", "https://"))
]


# === URLS / WSGI ===
ROOT_URLCONF = "seguros.urls"

# 🔐 URL del panel de administración (configurable por .env)
ADMIN_URL = os.getenv("ADMIN_URL", "admin/")

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "seguros.wsgi.application"


# === DATABASE ===
if os.getenv("DB_ENGINE"):
    DATABASES = {
        "default": {
            "ENGINE": os.getenv("DB_ENGINE"),
            "NAME": os.getenv("DB_NAME"),
            "USER": os.getenv("DB_USER"),
            "PASSWORD": os.getenv("DB_PASSWORD"),
            "HOST": os.getenv("DB_HOST"),
            "PORT": os.getenv("DB_PORT"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# === AUTH ===
AUTH_USER_MODEL = "accounts.User"


# === DRF / JWT ===
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny"
        if DEBUG
        else "rest_framework.permissions.IsAuthenticated"
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": int(os.getenv("API_PAGE_SIZE", "10")),
}

# En producción, solo JSON (sin UI browsable)
if not DEBUG:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (
        "rest_framework.renderers.JSONRenderer",
    )

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=int(os.getenv("JWT_ACCESS_HOURS", "8"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.getenv("JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "ALGORITHM": os.getenv("JWT_ALGORITHM", "HS256"),
    "SIGNING_KEY": os.getenv("JWT_SIGNING_KEY", SECRET_KEY),
}


# === INTERNACIONALIZACIÓN ===
LANGUAGE_CODE = "es-ar"
TIME_ZONE = "America/Argentina/Buenos_Aires"
USE_I18N = True
USE_TZ = True


# === STATIC & MEDIA ===
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_ROOT = os.getenv("MEDIA_ROOT", BASE_DIR / "media")
MEDIA_URL = os.getenv("MEDIA_URL", "/media/")


# === ARCHIVOS PDF / REPORTES ===
RECEIPT_TEMPLATE_PDF = os.getenv(
    "RECEIPT_TEMPLATE_PDF",
    str(BASE_DIR / "static" / "receipts" / "COMPROBANTE.pdf"),
)
RECEIPT_DEBUG_GRID = _bool(os.getenv("RECEIPT_DEBUG_GRID"), False)


# === LOGGING BÁSICO ===
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
}


# === DEFAULTS ===
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
