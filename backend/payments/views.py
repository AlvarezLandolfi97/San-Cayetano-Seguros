from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from .models import Payment
from .serializers import PaymentSerializer
from policies.models import Policy
from django.shortcuts import get_object_or_404
from .utils import generate_receipt_pdf
from django.utils.crypto import get_random_string

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().order_by('-id')
    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.action in ['create_preference']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['post'], url_path='policies/(?P<policy_id>[^/.]+)/create_preference')
    def create_preference(self, request, policy_id=None):
        policy = get_object_or_404(Policy, id=policy_id)
        user = request.user
        if (not user.is_staff) and (policy.holder_id != user.id):
            return Response({'detail':'No autorizado'}, status=403)

        amount = float(policy.product.base_price)
        period = request.data.get('period', '202509')

        payment = Payment.objects.create(policy=policy, period=period, amount=amount)
        payment.mp_preference_id = get_random_string(16)
        payment.save()
        init_point = f"https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id={payment.mp_preference_id}"
        return Response({'preference_id': payment.mp_preference_id, 'init_point': init_point, 'payment_id': payment.id})

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def mp_webhook(request):
    mp_payment_id = request.data.get('mp_payment_id')
    status_str = request.data.get('status')
    pid = request.data.get('payment_id')

    try:
        payment = Payment.objects.get(id=pid)
    except Payment.DoesNotExist:
        return Response({'detail':'payment_id inválido'}, status=400)

    payment.mp_payment_id = mp_payment_id or payment.mp_payment_id
    if status_str == 'approved':
        payment.state = 'APR'
        policy = payment.policy
        policy.state = 'ACT'
        policy.save()
        rel_path = generate_receipt_pdf(payment)
        payment.receipt_pdf.name = rel_path
        payment.save()
    elif status_str == 'rejected':
        payment.state = 'REJ'
        payment.save()
    else:
        payment.state = 'PEN'
        payment.save()

    return Response({'detail':'ok'})
