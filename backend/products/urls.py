# backend/products/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, HomeProductsListView, ProductAdminViewSet

# Router para los productos (endpoint principal)
router = DefaultRouter(trailing_slash=False)
router.register(r"", ProductViewSet, basename="products")
admin_router = DefaultRouter(trailing_slash=False)
admin_router.register(r"insurance-types", ProductAdminViewSet, basename="admin-insurance-types")

# URLs adicionales
urlpatterns = [
    # 🔹 Endpoint liviano para el Home
    path("home/", HomeProductsListView.as_view(), name="products-home"),
    path("home", HomeProductsListView.as_view(), name="products-home-noslash"),
]

# Combina las URLs personalizadas con las del router
# Importante: admin primero para evitar que el router público capture `/insurance-types` como PK.
urlpatterns += admin_router.urls
urlpatterns += router.urls
