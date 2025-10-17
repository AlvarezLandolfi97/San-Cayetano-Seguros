from rest_framework.routers import DefaultRouter
from .views import PolicyViewSet

"""
Rutas del módulo de pólizas (seguros).
Expone los endpoints bajo /api/policies/
"""

router = DefaultRouter()
router.register(r'policies', PolicyViewSet, basename='policies')

urlpatterns = router.urls
