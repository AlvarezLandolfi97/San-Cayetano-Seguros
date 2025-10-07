from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),

    # Healthcheck simple (para monitoreo / uptime)
    path("healthz", lambda r: JsonResponse({"status": "ok"}, status=200)),

    # API
    path("api/accounts/", include("accounts.urls")),
    path("api/vehicles/", include("vehicles.urls")),      # asegurate de tener 'vehicles' en INSTALLED_APPS
    path("api/products/", include("products.urls")),
    path("api/inspections/", include("inspections.urls")),
    path("api/policies/", include("policies.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/quotes/", include("quotes.urls")),
]

# En desarrollo, servir archivos estáticos y de media
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
