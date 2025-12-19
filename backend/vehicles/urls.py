from rest_framework.routers import DefaultRouter
from .views import VehicleViewSet

"""
Rutas del módulo de vehículos.
Expone los endpoints bajo /api/vehicles/
"""

# Se expone como /api/vehicles en seguros/urls.py, por eso el prefix queda vacío.
router = DefaultRouter(trailing_slash=False)
router.register(r"", VehicleViewSet, basename="vehicles")

urlpatterns = router.urls
