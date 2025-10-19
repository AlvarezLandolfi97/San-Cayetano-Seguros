# backend/products/views.py
from rest_framework import viewsets, permissions
from rest_framework.generics import ListAPIView
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from .models import Product
from .serializers import ProductSerializer, HomeProductSerializer


# 🔹 ViewSet general (ya existente)
class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/products/
    Devuelve todos los productos publicados para el Home (versión completa).
    """
    queryset = Product.objects.filter(published_home=True).order_by("id")
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]


# 🔹 Vista optimizada para el Home
@method_decorator(cache_page(60), name="dispatch")  # Cache 60 segundos
class HomeProductsListView(ListAPIView):
    """
    GET /api/products/home
    Devuelve una versión liviana para el carrusel del Home.
    Incluye solo: id, name, plan_type, vehicle_type, franchise, coverages_lite.
    """
    serializer_class = HomeProductSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Product.objects.all()

        # Filtra si el modelo tiene published_home
        if hasattr(Product, "published_home"):
            qs = qs.filter(published_home=True)

        # Campos mínimos para optimizar consulta
        qs = qs.only("id", "name", "plan_type", "vehicle_type", "franchise")

        # Orden por home_order si existe, si no por nombre
        if hasattr(Product, "home_order"):
            qs = qs.order_by("home_order", "id")
        else:
            qs = qs.order_by("name", "id")

        return qs
