from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.shortcuts import redirect


# === Healthcheck ===
def healthcheck(request):
    """
    Endpoint simple para verificar el estado del servidor.
    Útil para monitoreo o comprobaciones automáticas.
    """
    return JsonResponse({"status": "ok"}, status=200)


# === URL patterns principales ===
urlpatterns = [
    # Admin — configurable por .env
    path(settings.ADMIN_URL, admin.site.urls),

    # (Opcional) redirect desde /admin/ → ADMIN_URL
    path("admin/", lambda r: redirect("/" + settings.ADMIN_URL, permanent=True)),

    # Healthcheck
    path("healthz/", healthcheck, name="healthcheck"),

    # API
    path("api/common/", include("common.urls")),
    path("api/accounts/", include("accounts.urls")),
    path("api/vehicles/", include("vehicles.urls")),
    path("api/products/", include("products.urls")),
    path("api/inspections/", include("inspections.urls")),
    path("api/policies/", include("policies.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/quotes/", include("quotes.urls")),
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
