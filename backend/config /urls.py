from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    # API apps
    path("api/accounts/", include("accounts.urls")),
    path("api/products/", include("products.urls")),
    path("api/quotes/", include("quotes.urls")),
    path("api/", include("inspections.urls")),
    path("api/policies/", include("policies.urls")),
    path("api/payments/", include("payments.urls")),  # ⚠️ solo A
]

# Servir archivos subidos en dev
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
