from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import PaymentViewSet, mp_webhook, manual_payment

router = DefaultRouter(trailing_slash=False)
router.register(r'', PaymentViewSet, basename='payments')

urlpatterns = router.urls + [
    path('webhook', mp_webhook, name='mp_webhook'),
    # Legacy path (trailing slash) left for compatibility with external integrations that do not strip slashes.
    path('webhook/', mp_webhook, name='mp_webhook_legacy'),
    path('manual/<int:policy_id>', manual_payment, name='manual_payment'),
    path('manual/<int:policy_id>/', manual_payment, name='manual_payment_legacy'),
]
