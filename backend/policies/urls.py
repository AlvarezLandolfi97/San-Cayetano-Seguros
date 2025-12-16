from rest_framework.routers import DefaultRouter
from .views import PolicyViewSet

# /api/policies/...
router = DefaultRouter(trailing_slash=False)
router.register(r'', PolicyViewSet, basename='policies')

urlpatterns = router.urls
