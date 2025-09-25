from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import PaymentViewSet, mp_webhook

router = DefaultRouter()
router.register(r'', PaymentViewSet, basename='payments')

urlpatterns = router.urls + [
    path('webhook/', mp_webhook, name='mp_webhook'),
]
