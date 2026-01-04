from rest_framework.routers import DefaultRouter
from .views import AdminPolicyViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'policies', AdminPolicyViewSet, basename='admin-policies')

urlpatterns = router.urls
