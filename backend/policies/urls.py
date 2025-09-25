from rest_framework.routers import DefaultRouter
from .views import PolicyViewSet
router = DefaultRouter()
router.register(r'', PolicyViewSet, basename='policies')
urlpatterns = router.urls
