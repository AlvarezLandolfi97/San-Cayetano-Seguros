import os

from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from .models import Payment
from .serializers import PaymentSerializer, ChargeSerializer
from policies.models import Policy
from django.shortcuts import get_object_or_404
from .utils import generate_receipt_pdf
from django.utils.crypto import get_random_string, constant_time_compare
from .models import Charge, Receipt
from datetime import date
from common.models import AppSettings
from policies.billing import current_payment_cycle


def _authorize_mp_webhook(request):
    """
    Valida la firma del webhook usando un secreto compartido (env MP_WEBHOOK_SECRET).
    Acepta:
      - Header `X-Mp-Signature: <token>`
      - Authorization: Bearer <token>
    """
    secret = os.getenv("MP_WEBHOOK_SECRET", "").strip()
    if not secret:
        return False, "MP_WEBHOOK_SECRET no está configurado en el entorno"

    bearer = (request.headers.get("Authorization") or "").replace("Bearer", "").strip()
    incoming = (request.headers.get("X-Mp-Signature") or bearer or "").strip()

    if not incoming:
        return False, "Falta firma del webhook"
    if not constant_time_compare(incoming, secret):
        return False, "Firma inválida"
    return True, ""


def _current_payment_window(policy, settings_obj):
    """
    Devuelve (inicio, fin) de la ventana de pago vigente o próxima,
    siguiendo la misma lógica que policies/_policy_timeline.
    """
    cycle = current_payment_cycle(policy, settings_obj)
    if not cycle:
        return None, None
    return cycle.get("payment_window_start"), cycle.get("due_real")

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().order_by('-id')
    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.action in ['create_preference', 'pending']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['post'], url_path='policies/(?P<policy_id>[^/.]+)/create_preference')
    def create_preference(self, request, policy_id=None):
        policy = get_object_or_404(Policy, id=policy_id)
        user = request.user
        if (not user.is_staff) and (policy.user_id != user.id):
            return Response({'detail':'No autorizado'}, status=403)

        raw_charge_ids = request.data.get('charge_ids') or []
        charge_ids = raw_charge_ids if isinstance(raw_charge_ids, (list, tuple)) else []

        charges_qs = Charge.objects.filter(id__in=charge_ids, policy=policy, status="pending")
        amount = sum(float(ch.amount or 0) for ch in charges_qs) if charges_qs.exists() else float(getattr(policy, "premium", None) or getattr(getattr(policy, "product", None), "base_price", 0) or 0)
        if amount <= 0:
            return Response({'detail': 'Monto inválido para iniciar el pago.'}, status=400)
        period = request.data.get('period') or None
        if not period:
            due = charges_qs.first().due_date if charges_qs.exists() else getattr(policy, "end_date", None)
            if due:
                period = f"{due.year}{str(due.month).zfill(2)}"
        if not period:
            period = '202509'

        payment = Payment.objects.create(policy=policy, period=period, amount=amount)
        payment.mp_preference_id = get_random_string(16)
        payment.save()
        init_point = f"https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id={payment.mp_preference_id}"
        return Response({'preference_id': payment.mp_preference_id, 'init_point': init_point, 'payment_id': payment.id})

    @action(detail=False, methods=['get'], url_path='pending')
    def pending(self, request):
        policy_id = request.query_params.get("policy_id")
        if not policy_id:
            return Response({"detail": "policy_id requerido"}, status=400)
        policy = get_object_or_404(Policy, id=policy_id)
        user = request.user
        if (not user.is_staff) and (policy.user_id != user.id):
            return Response({'detail':'No autorizado'}, status=403)
        settings_obj = AppSettings.get_solo()
        window_start, window_end = _current_payment_window(policy, settings_obj)

        # Si estamos dentro de la ventana y no hay un cargo pendiente NI uno pagado en esta ventana, lo generamos.
        if window_start and window_end and window_start <= date.today() <= window_end:
            exists_pending_in_window = Charge.objects.filter(
                policy=policy,
                status="pending",
                due_date__gte=window_start,
                due_date__lte=window_end,
            ).exists()
            exists_paid_in_window = Charge.objects.filter(
                policy=policy,
                status="paid",
                due_date__gte=window_start,
                due_date__lte=window_end,
            ).exists()
            if exists_paid_in_window:
                # Ya se pagó en esta ventana: no devolvemos pendientes.
                return Response([])
            if not exists_pending_in_window:
                amount = getattr(policy, "premium", None) or getattr(getattr(policy, "product", None), "base_price", None) or 0
                Charge.objects.create(
                    policy=policy,
                    concept="Cuota del período",
                    amount=amount,
                    due_date=window_end,
                    status="pending",
                )

        qs = Charge.objects.filter(policy=policy, status="pending")
        # Si tenemos ventana vigente, solo mostramos los cargos pendientes dentro de esa ventana
        if window_start and window_end:
            qs = qs.filter(due_date__gte=window_start, due_date__lte=window_end)
        qs = qs.order_by("-id")
        return Response(ChargeSerializer(qs, many=True).data)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def mp_webhook(request):
    ok, err = _authorize_mp_webhook(request)
    if not ok:
        return Response({'detail': err}, status=403)

    mp_payment_id = request.data.get('mp_payment_id')
    status_str = request.data.get('status')
    pid = request.data.get('payment_id')
    preference_id = request.data.get('mp_preference_id')

    try:
        payment = Payment.objects.get(id=pid)
    except Payment.DoesNotExist:
        return Response({'detail':'payment_id inválido'}, status=400)

    if preference_id and payment.mp_preference_id and preference_id != payment.mp_preference_id:
        return Response({'detail':'mp_preference_id no coincide'}, status=400)

    payment.mp_payment_id = mp_payment_id or payment.mp_payment_id
    status_norm = (status_str or "").lower()
    if status_norm == 'approved':
        payment.state = 'APR'
        policy = payment.policy
        policy.state = 'ACT'
        policy.save()
        charges_qs = Charge.objects.filter(policy=policy, status="pending").order_by("-id")
        charge = charges_qs.first()
        if charges_qs.exists():
            charges_qs.update(status="paid")
        receipt = Receipt.objects.create(
            policy=policy,
            charge=charge,
            amount=getattr(charge, "amount", payment.amount),
            concept=getattr(charge, "concept", "Pago con Mercado Pago"),
            method="mercadopago",
            auth_code=str(mp_payment_id or ""),
            next_due=None,
        )
        rel_path = generate_receipt_pdf(payment)
        payment.receipt_pdf.name = rel_path
        payment.save(update_fields=["mp_payment_id", "state", "receipt_pdf"])
        if rel_path:
            receipt.file.name = rel_path
            receipt.save(update_fields=["file"])
    elif status_norm == 'rejected':
        payment.state = 'REJ'
        payment.save(update_fields=["mp_payment_id", "state"])
    else:
        payment.state = 'PEN'
        payment.save(update_fields=["mp_payment_id", "state"])

    return Response({'detail':'ok'})


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def manual_payment(request, policy_id=None):
    policy = get_object_or_404(Policy, id=policy_id)
    settings_obj = AppSettings.get_solo()
    today = date.today()
    cycle = current_payment_cycle(policy, settings_obj) or {}
    payment_start = cycle.get("payment_window_start") or getattr(policy, "start_date", None) or today
    payment_end = cycle.get("due_real") or payment_start

    charge = Charge.objects.filter(policy=policy, status="pending").order_by("-id").first()
    if charge:
        charge.status = "paid"
        if not charge.due_date:
            charge.due_date = payment_end or today
        charge.save()
    amount = charge.amount if charge else policy.premium
    concept = charge.concept if charge else "Pago manual"
    if not charge:
        charge = Charge.objects.create(
            policy=policy,
            concept=concept,
            amount=amount,
            due_date=payment_end or today,
            status="paid",
        )
    receipt = Receipt.objects.create(
        policy=policy,
        charge=charge,
        amount=amount,
        concept=concept,
        method="manual",
        auth_code="admin-marked",
        next_due=None,
        date=date.today(),
    )
    # Si se registra pago manual, marcamos también pagos pendientes como aprobados
    Payment.objects.filter(policy=policy, state="PEN").update(state="APR")

    # Generar comprobante PDF coherente con la póliza
    period_str = None
    if charge and charge.due_date:
        period_str = f"{charge.due_date.year}{str(charge.due_date.month).zfill(2)}"
    pay_obj = Payment.objects.create(
        policy=policy,
        period=period_str or f"{today.year}{str(today.month).zfill(2)}",
        amount=amount,
        state="APR",
        mp_payment_id="manual",
    )
    rel_path = generate_receipt_pdf(pay_obj)
    if rel_path:
        pay_obj.receipt_pdf.name = rel_path
        pay_obj.save(update_fields=["receipt_pdf"])
        receipt.file.name = rel_path
        receipt.save(update_fields=["file"])

    return Response({"detail": "Pago registrado manualmente.", "receipt_id": receipt.id})
