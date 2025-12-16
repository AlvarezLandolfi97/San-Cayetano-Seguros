from rest_framework.routers import DefaultRouter
from .views import UserViewSet

# trailing_slash=False para aceptar /api/admin/users sin barra final
router = DefaultRouter(trailing_slash=False)
router.register(r'users', UserViewSet, basename='admin-users')

urlpatterns = router.urls
