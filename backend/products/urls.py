# backend/products/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, HomeProductsListView, ProductAdminViewSet

# Router para el admin (insurances)
admin_router = DefaultRouter(trailing_slash=False)
admin_router.register(r"insurance-types", ProductAdminViewSet, basename="admin-insurance-types")

# URLs públicas
list_view = ProductViewSet.as_view({"get": "list"})
detail_view = ProductViewSet.as_view({"get": "retrieve"})

urlpatterns = [
    path("", list_view, name="products-list"),
    path("<int:pk>/", detail_view, name="products-detail"),
    path("<int:pk>", detail_view, name="products-detail-noslash"),
    path("home/", HomeProductsListView.as_view(), name="products-home"),
    path("home", HomeProductsListView.as_view(), name="products-home-noslash"),
]

urlpatterns += admin_router.urls
