import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

# === BASE DIR ===
BASE_DIR = Path(__file__).resolve().parent.parent
# Cargar variables desde backend/.env
load_dotenv(BASE_DIR / ".env")

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

# En producción debe estar en False; por defecto se desactiva salvo que se explicite.
DEBUG = _bool(os.getenv("DJANGO_DEBUG") or os.getenv("DEBUG"), False)

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
    "common",
    "accounts",
    "vehicles",
    "products",
    "policies",
    "payments",
    "quotes",
    "core",
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

# En dev liberamos CORS; en prod solo orígenes listados
CORS_ALLOW_ALL_ORIGINS = bool(DEBUG)

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
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated"
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": int(os.getenv("API_PAGE_SIZE", "10")),
    # Permite al front solicitar tamaños personalizados (p. ej. page_size=200 en admin)
    "PAGE_SIZE_QUERY_PARAM": "page_size",
    "MAX_PAGE_SIZE": int(os.getenv("API_MAX_PAGE_SIZE", "500")),
    # Limitamos bursts básicos y un scope específico para /quotes/*
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("API_THROTTLE_ANON", "60/hour"),
        "user": os.getenv("API_THROTTLE_USER", "120/hour"),
        "quotes": os.getenv("API_THROTTLE_QUOTES", "10/hour"),
        "login": os.getenv("API_THROTTLE_LOGIN", "20/hour"),
        "reset": os.getenv("API_THROTTLE_RESET", "10/hour"),
        "register": os.getenv("API_THROTTLE_REGISTER", "30/hour"),
        "claim": os.getenv("API_THROTTLE_CLAIM", "15/hour"),
    },
}

# En producción, solo JSON (sin UI browsable).
if not DEBUG:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (
        "rest_framework.renderers.JSONRenderer",
    )
# En desarrollo podés liberar permisos solo si lo pedís explícitamente.
if DEBUG and _bool(os.getenv("API_ALLOW_ANY_IN_DEBUG"), False):
    REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
        "rest_framework.permissions.AllowAny"
    ]

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
# Límite de subida (aplica a uploads en memoria y data payloads)
MEDIA_MAX_UPLOAD_MB = int(os.getenv("MEDIA_MAX_UPLOAD_MB", "10"))
FILE_UPLOAD_MAX_MEMORY_SIZE = MEDIA_MAX_UPLOAD_MB * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = FILE_UPLOAD_MAX_MEMORY_SIZE

# Media: en prod deshabilitado por defecto (usar CDN/servidor de archivos).
# Si querés servir desde Django en prod, poné SERVE_MEDIA_FILES=true y ALLOW_SERVE_MEDIA_IN_PROD=true conscientemente.
SERVE_MEDIA_FILES = DEBUG or _bool(os.getenv("SERVE_MEDIA_FILES"), False)
if not DEBUG and SERVE_MEDIA_FILES and not _bool(os.getenv("ALLOW_SERVE_MEDIA_IN_PROD"), False):
    raise ImproperlyConfigured(
        "SERVE_MEDIA_FILES está habilitado en producción. Serví /media/ desde CDN/Nginx o define ALLOW_SERVE_MEDIA_IN_PROD=true bajo tu riesgo."
    )

# === ARCHIVOS PDF / REPORTES ===
RECEIPT_TEMPLATE_PDF = os.getenv(
    "RECEIPT_TEMPLATE_PDF",
    str(BASE_DIR / "static" / "receipts" / "COMPROBANTE.pdf"),
)
RECEIPT_DEBUG_GRID = _bool(os.getenv("RECEIPT_DEBUG_GRID"), False)

# === EMAIL ===
EMAIL_BACKEND = os.getenv(
    "DJANGO_EMAIL_BACKEND",
    os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"),
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = _bool(os.getenv("EMAIL_USE_TLS"), True)
EMAIL_USE_SSL = _bool(os.getenv("EMAIL_USE_SSL"), False)
# Remitente por defecto para correos salientes (2FA, etc.)
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@sancayetano.com")
# Bloqueamos el backend de consola en producción para garantizar entrega real,
# salvo que se explicite la excepción.
if (
    not DEBUG
    and EMAIL_BACKEND.endswith("console.EmailBackend")
    and not _bool(os.getenv("ALLOW_CONSOLE_EMAIL_IN_PROD"), False)
):
    raise ImproperlyConfigured(
        "EMAIL_BACKEND apunta a consola en producción. Configurá SMTP o define ALLOW_CONSOLE_EMAIL_IN_PROD=true solo para entornos controlados."
    )


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

# === SECURITY / COOKIES ===
# Ajustes pensados para producción; controlables por env.
SESSION_COOKIE_SECURE = _bool(os.getenv("SESSION_COOKIE_SECURE"), not DEBUG)
CSRF_COOKIE_SECURE = _bool(os.getenv("CSRF_COOKIE_SECURE"), not DEBUG)
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
CSRF_COOKIE_SAMESITE = os.getenv("CSRF_COOKIE_SAMESITE", "Lax")
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_SSL_REDIRECT = _bool(os.getenv("SECURE_SSL_REDIRECT"), not DEBUG)
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "0" if DEBUG else "3600"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = _bool(os.getenv("SECURE_HSTS_INCLUDE_SUBDOMAINS"), True)
SECURE_HSTS_PRELOAD = _bool(os.getenv("SECURE_HSTS_PRELOAD"), False)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False


# === DEFAULTS ===
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
