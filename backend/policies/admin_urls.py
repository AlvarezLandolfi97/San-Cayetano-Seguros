from rest_framework.routers import DefaultRouter
from .views import PolicyViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'policies', PolicyViewSet, basename='admin-policies')

urlpatterns = router.urls
