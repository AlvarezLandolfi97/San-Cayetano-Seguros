from rest_framework.routers import DefaultRouter
from .views import VehicleViewSet

"""
Rutas del módulo de vehículos.
Expone los endpoints bajo /api/vehicles/
"""

router = DefaultRouter()
router.register(r"vehicles", VehicleViewSet, basename="vehicles")

urlpatterns = router.urls
