import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# BASE_DIR = backend/seguros
BASE_DIR = Path(__file__).resolve().parent.parent
# Cargar backend/.env explícitamente
load_dotenv(BASE_DIR.parent / ".env")

# Helpers
def _bool(v, default=False):
    if v is None:
        return default
    return str(v).lower() in ("1", "true", "t", "yes", "y", "on")

# Core
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY") or os.getenv("SECRET_KEY") or "dev-secret"
DEBUG = _bool(os.getenv("DJANGO_DEBUG") or os.getenv("DEBUG"), True)

_hosts_env = os.getenv("DJANGO_ALLOWED_HOSTS") or os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1")
ALLOWED_HOSTS = ["*"] if "*" in _hosts_env else [h.strip() for h in _hosts_env.split(",") if h.strip()]

# Apps
INSTALLED_APPS = [
    "django.contrib.admin","django.contrib.auth","django.contrib.contenttypes",
    "django.contrib.sessions","django.contrib.messages","django.contrib.staticfiles",
    "rest_framework","rest_framework_simplejwt","corsheaders",
    "accounts","vehicles","products","inspections","policies","payments","quotes",
]

# Middleware (orden recomendado)
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",      # CORS alto y antes de Common
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# CORS
_frontend_env = os.getenv("FRONTEND_ORIGINS") or os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ALLOWED_ORIGINS = [o.strip() for o in _frontend_env.split(",") if o.strip()]
CORS_ALLOW_CREDENTIALS = _bool(os.getenv("CORS_ALLOW_CREDENTIALS"), False)
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# URLs / WSGI
ROOT_URLCONF = "seguros.urls"
TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [], "APP_DIRS": True,
    "OPTIONS": {"context_processors":[
        "django.template.context_processors.debug",
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]
WSGI_APPLICATION = "seguros.wsgi.application"

# DB: usa env si hay DB_ENGINE; si no, SQLite
if os.getenv("DB_ENGINE"):
    DATABASES = {"default": {
        "ENGINE": os.getenv("DB_ENGINE"),
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST"),
        "PORT": os.getenv("DB_PORT"),
    }}
else:
    DATABASES = {"default": {
        "ENGINE":"django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3"
    }}

# Usuario custom
AUTH_USER_MODEL = "accounts.User"

# DRF / JWT
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",   # cambia a IsAuthenticated en prod si querés
    ),
}
SIMPLE_JWT = {"ACCESS_TOKEN_LIFETIME": timedelta(hours=8)}

# i18n
LANGUAGE_CODE = "es-ar"
TIME_ZONE = "America/Argentina/Buenos_Aires"
USE_I18N = True
USE_TZ = True

# Static & Media
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_ROOT = os.getenv("MEDIA_ROOT", BASE_DIR / "media")
MEDIA_URL = os.getenv("MEDIA_URL", "/media/")

# Defaults
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
