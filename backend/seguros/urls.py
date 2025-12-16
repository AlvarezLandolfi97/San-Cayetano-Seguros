from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.shortcuts import redirect
from common.views import AppSettingsView
from accounts.auth_views import EmailLoginView, PasswordResetRequestView, PasswordResetConfirmView, RegisterView
from accounts.views import UserViewSet
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView


# === Healthcheck ===
def healthcheck(request):
    """
    Endpoint simple para verificar el estado del servidor.
    Útil para monitoreo o comprobaciones automáticas.
    """
    return JsonResponse({"status": "ok"}, status=200)


# === URL patterns principales ===
# Alias directo /api/users/me
alias_router = DefaultRouter(trailing_slash=False)
alias_router.register(r"users", UserViewSet, basename="users-alias")

urlpatterns = [
    # Admin — configurable por .env
    path(settings.ADMIN_URL, admin.site.urls),

    # (Opcional) redirect desde /admin/ → ADMIN_URL
    path("admin/", lambda r: redirect("/" + settings.ADMIN_URL, permanent=True)),

    # Healthcheck
    path("healthz/", healthcheck, name="healthcheck"),

    # API
    path("api/common/", include("common.urls")),
    # Alias sin prefijo /common/ para compatibilidad con el front
    path("api/", include("common.urls")),
    path("api/accounts/", include("accounts.urls")),
    # Auth alias compatible con el frontend
    path("api/auth/login", EmailLoginView.as_view(), name="auth-login"),
    path("api/auth/refresh", TokenRefreshView.as_view(), name="auth-refresh"),
    path("api/auth/register", RegisterView.as_view(), name="auth-register"),
    path("api/auth/password/reset", PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path("api/auth/password/reset/confirm", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
    path("api/vehicles/", include("vehicles.urls")),
    path("api/products/", include("products.urls")),
    path("api/inspections/", include("inspections.urls")),
    path("api/policies/", include("policies.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/quotes/", include("quotes.urls")),
    # Alias directo para /api/users/… además de /api/accounts/…
    path("api/", include(alias_router.urls)),
    # Rutas admin esperadas por el front
    path("api/admin/", include("policies.admin_urls")),
    path("api/admin/", include("accounts.admin_urls")),
    path("api/admin/", include("products.urls")),
    path("api/admin/settings", AppSettingsView.as_view(), name="admin-settings"),
]


# === Archivos estáticos y media ===
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)


# === Root amigable (en lugar del 404) ===
urlpatterns += [
    path(
        "",
        lambda r: JsonResponse(
            {
                "message": "San Cayetano API 🚗✅",
                "endpoints": [
                    "/api/accounts/",
                    "/api/vehicles/",
                    "/api/products/",
                    "/api/inspections/",
                    "/api/policies/",
                    "/api/payments/",
                    "/api/quotes/",
                    "/healthz/",
                    f"/{settings.ADMIN_URL}",
                ],
            },
            status=200,
        ),
        name="api-root",
    ),
]
