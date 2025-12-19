from rest_framework.routers import DefaultRouter
from .views import ProductAdminViewSet

# trailing_slash=False para aceptar /api/admin/insurance-types sin barra final
router = DefaultRouter(trailing_slash=False)
router.register(r"insurance-types", ProductAdminViewSet, basename="admin-insurance-types")

urlpatterns = router.urls
