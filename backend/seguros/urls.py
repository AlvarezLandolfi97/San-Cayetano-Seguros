from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/vehicles/', include('vehicles.urls')),
    path('api/products/', include('products.urls')),
    path('api/inspections/', include('inspections.urls')),
    path('api/policies/', include('policies.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/quotes/', include('quotes.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
