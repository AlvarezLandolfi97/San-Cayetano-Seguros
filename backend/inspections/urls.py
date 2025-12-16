from rest_framework.routers import DefaultRouter
from .views import InspectionViewSet
router = DefaultRouter(trailing_slash=False)
router.register(r'', InspectionViewSet, basename='inspections')
urlpatterns = router.urls
