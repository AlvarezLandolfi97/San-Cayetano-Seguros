# backend/products/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, HomeProductsListView

# Router para los productos (endpoint principal)
router = DefaultRouter()
router.register(r"", ProductViewSet, basename="products")

# URLs adicionales
urlpatterns = [
    # 🔹 Endpoint liviano para el Home
    path("home/", HomeProductsListView.as_view(), name="products-home"),
]

# Combina las URLs personalizadas con las del router
urlpatterns += router.urls
