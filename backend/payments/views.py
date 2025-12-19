import logging
import os
import uuid
from decimal import Decimal

import requests
from rest_framework import permissions, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from common.models import AppSettings
from policies.billing import current_payment_cycle, mark_cycle_installment_paid
from policies.models import Policy

from .models import Charge, Payment, Receipt
from .serializers import ChargeSerializer, PaymentSerializer
from .utils import generate_receipt_pdf

from datetime import date
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils.crypto import get_random_string, constant_time_compare

def _env_bool(val):
    return str(val).strip().lower() in ("1", "true", "t", "yes", "y", "on") if val is not None else False


logger = logging.getLogger(__name__)


def _authorize_mp_webhook(request):
    """
    Valida la firma del webhook usando un secreto compartido (env MP_WEBHOOK_SECRET).
    Acepta:
      - Header `X-Mp-Signature: <token>`
      - Authorization: Bearer <token>
    """
    secret = (os.getenv("MP_WEBHOOK_SECRET") or "").strip()
    # En producción lo exigimos por defecto; en DEBUG permitimos sin secreto.
    require_secret = not settings.DEBUG
    if os.getenv("MP_REQUIRE_WEBHOOK_SECRET") is not None:
        require_secret = _env_bool(os.getenv("MP_REQUIRE_WEBHOOK_SECRET"))
    allow_no_secret = _env_bool(os.getenv("MP_ALLOW_WEBHOOK_NO_SECRET"))

    if not secret:
        if not require_secret and allow_no_secret:
            logger.warning("MP_WEBHOOK_SECRET no configurado. Aceptando webhook sin firma porque MP_ALLOW_WEBHOOK_NO_SECRET está activo.")
            return True, "MP_WEBHOOK_SECRET ausente; se aceptó sin validar firma."
        if settings.DEBUG:
            return True, "MP_WEBHOOK_SECRET ausente; permitido por DEBUG."
        return False, "MP_WEBHOOK_SECRET requerido (definí la variable o habilitá MP_ALLOW_WEBHOOK_NO_SECRET explícitamente)."

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


def _mp_headers():
    token = os.getenv("MP_ACCESS_TOKEN") or os.getenv("MERCADOPAGO_ACCESS_TOKEN")
    if not token:
        return None
    return {"Authorization": f"Bearer {token}"}


def _mp_fake_payments_allowed():
    """
    Permite simular pagos cuando no hay token de MP.
    Útil en desarrollo o entornos sin MP configurado.
    """
    if not settings.DEBUG:
        return False
    # En DEBUG permitimos si la variable no existe o está en true.
    return _env_bool(os.getenv("MP_ALLOW_FAKE_PREFERENCES") or "true")


def _mp_notification_url(request):
    override = os.getenv("MP_NOTIFICATION_URL")
    if override:
        return override
    try:
        return request.build_absolute_uri(reverse("mp_webhook"))
    except Exception:
        return None


def _mp_create_preference(payload):
    headers = _mp_headers()
    if not headers:
        return None, "MP_ACCESS_TOKEN no configurado"
    try:
        resp = requests.post(
            "https://api.mercadopago.com/checkout/preferences",
            json=payload,
            headers=headers,
            timeout=10,
        )
        if resp.status_code >= 300:
            return None, f"Mercado Pago respondió {resp.status_code}: {resp.text}"
        return resp.json(), ""
    except Exception as exc:
        return None, f"No se pudo crear preferencia en Mercado Pago: {exc}"


def _mp_fetch_payment(mp_payment_id):
    headers = _mp_headers()
    if not headers:
        return None, "MP_ACCESS_TOKEN no configurado"
    try:
        resp = requests.get(
            f"https://api.mercadopago.com/v1/payments/{mp_payment_id}",
            headers=headers,
            timeout=10,
        )
        if resp.status_code >= 300:
            return None, f"Mercado Pago respondió {resp.status_code}: {resp.text}"
        return resp.json(), ""
    except Exception as exc:
        return None, f"No se pudo consultar el pago en Mercado Pago: {exc}"

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().order_by('-id')
    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.action in ['create_preference', 'pending']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['get'], url_path='config', permission_classes=[permissions.IsAdminUser])
    def config(self, request):
        """
        Health-check de configuración de pagos/MP.
        Solo admins.
        """
        token_ok = bool(_mp_headers())
        secret = bool((os.getenv("MP_WEBHOOK_SECRET") or "").strip())
        require_secret = not settings.DEBUG
        if os.getenv("MP_REQUIRE_WEBHOOK_SECRET") is not None:
            require_secret = _env_bool(os.getenv("MP_REQUIRE_WEBHOOK_SECRET"))
        allow_fake = _mp_fake_payments_allowed()
        notification_url = _mp_notification_url(request)
        return Response(
            {
                "mp_token_configured": token_ok,
                "webhook_secret_configured": secret,
                "webhook_secret_required": require_secret,
                "fake_payments_allowed": allow_fake,
                "notification_url": notification_url,
                "debug": settings.DEBUG,
            }
        )

    @action(detail=False, methods=['post'], url_path='policies/(?P<policy_id>[^/.]+)/create_preference')
    def create_preference(self, request, policy_id=None):
        policy = get_object_or_404(Policy, id=policy_id)
        user = request.user
        if (not user.is_staff) and (policy.user_id != user.id):
            return Response({'detail':'No autorizado'}, status=403)

        raw_charge_ids = request.data.get('charge_ids') or []
        charge_ids = raw_charge_ids if isinstance(raw_charge_ids, (list, tuple)) else []

        settings_obj = AppSettings.get_solo()
        window_start, window_end = _current_payment_window(policy, settings_obj)

        charges_qs = Charge.objects.filter(id__in=charge_ids, policy=policy, status="pending")
        # Si no seleccionaron cargos, usamos (o generamos) el pendiente de la ventana actual
        if not charges_qs.exists():
            if not window_start or not window_end:
                return Response({'detail': 'No hay una ventana de pago vigente.'}, status=400)
            charge, _ = Charge.objects.get_or_create(
                policy=policy,
                status="pending",
                due_date=window_end,
                defaults={
                    "concept": "Cuota del período",
                    "amount": getattr(policy, "premium", None) or getattr(getattr(policy, "product", None), "base_price", None) or 0,
                },
            )
            charges_qs = Charge.objects.filter(id=charge.id)

        amount = sum(Decimal(str(ch.amount or 0)) for ch in charges_qs)
        if amount <= 0:
            return Response({'detail': 'Monto inválido para iniciar el pago.'}, status=400)

        period = request.data.get('period') or None
        if not period:
            due = charges_qs.first().due_date
            if due:
                period = f"{due.year}{str(due.month).zfill(2)}"
        if not period:
            return Response({'detail': 'No se pudo determinar el período de pago.'}, status=400)

        headers = _mp_headers()
        payment = Payment.objects.create(policy=policy, period=period, amount=amount)
        logger.info(
            "payment_create_preference_start",
            extra={
                "payment_id": payment.id,
                "policy_id": policy.id,
                "amount": float(amount),
                "user_id": user.id,
                "has_mp_token": bool(headers),
            },
        )

        # Si MP no está configurado, permitimos un modo "fake" para no bloquear cobros en demo.
        if not headers:
            if not _mp_fake_payments_allowed():
                payment.delete()
                return Response(
                    {
                        "detail": "Mercado Pago no está configurado (MP_ACCESS_TOKEN ausente). "
                                  "Definí MP_ACCESS_TOKEN o habilitá MP_ALLOW_FAKE_PREFERENCES para modo demo."
                    },
                    status=503,
                )
            # Modo demo: marcamos pago como aprobado y generamos recibo.
            payment.state = "APR"
            payment.mp_preference_id = f"offline-{payment.id}"
            payment.mp_payment_id = "offline"
            payment.save(update_fields=["state", "mp_preference_id", "mp_payment_id"])
            logger.warning(
                "payment_fake_mode_used",
                extra={"payment_id": payment.id, "policy_id": policy.id, "amount": float(amount)},
            )
            charges_qs.update(status="paid")
            mark_cycle_installment_paid(policy, payment=payment)
            receipt = Receipt.objects.create(
                policy=policy,
                charge=charges_qs.first(),
                amount=amount,
                concept="Pago registrado en modo demo (sin MP)",
                method="manual",
                auth_code="offline",
                next_due=None,
            )
            rel_path = generate_receipt_pdf(payment)
            if rel_path:
                payment.receipt_pdf.name = rel_path
                payment.save(update_fields=["receipt_pdf"])
                receipt.file.name = rel_path
                receipt.save(update_fields=["file"])

            # Devolvemos un init_point simulado para que el front no falle al abrir.
            fake_init_point = f"https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id={payment.mp_preference_id}"
            return Response(
                {
                    'preference_id': payment.mp_preference_id,
                    'mp_preference_id': payment.mp_preference_id,
                    'init_point': fake_init_point,
                    'payment_id': payment.id,
                    'offline': True,
                }
            )

        # Payload real para MP
        items = [
            {
                "title": ch.concept or "Cuota del período",
                "quantity": 1,
                "unit_price": float(ch.amount or 0),
                "currency_id": "ARS",
            }
            for ch in charges_qs
        ]
        notification_url = _mp_notification_url(request)
        preference_payload = {
            "items": items,
            "external_reference": str(payment.id),
            "metadata": {
                "payment_id": payment.id,
                "policy_id": policy.id,
            },
            "statement_descriptor": "SAN CAYETANO",
        }
        if notification_url:
            preference_payload["notification_url"] = notification_url

        pref_data, err = _mp_create_preference(preference_payload)
        if pref_data is None:
            payment.delete()
            logger.error(
                "payment_create_preference_failed",
                extra={"payment_id": payment.id, "policy_id": policy.id, "error": err},
            )
            return Response({"detail": err}, status=502)

        preference_id = pref_data.get("id") or pref_data.get("preference_id")
        init_point = pref_data.get("init_point") or pref_data.get("sandbox_init_point")
        if not preference_id or not init_point:
            payment.delete()
            return Response({"detail": "Mercado Pago no devolvió preference_id/init_point."}, status=502)

        payment.mp_preference_id = preference_id
        payment.save(update_fields=["mp_preference_id"])
        logger.info(
            "payment_create_preference_success",
            extra={
                "payment_id": payment.id,
                "policy_id": policy.id,
                "preference_id": preference_id,
                "amount": float(amount),
            },
        )

        return Response({'preference_id': preference_id, 'mp_preference_id': preference_id, 'init_point': init_point, 'payment_id': payment.id})

    @action(detail=False, methods=['get'], url_path='pending')
    def pending(self, request):
        policy_id = request.query_params.get("policy_id")
        if not policy_id:
            return Response({"detail": "policy_id requerido"}, status=400)
        policy = get_object_or_404(Policy, id=policy_id)
        user = request.user
        if (not user.is_staff) and (policy.user_id != user.id):
            return Response({'detail':'No autorizado'}, status=403)
        # Datos mínimos requeridos para generar cargos
        if not getattr(policy, "start_date", None):
            return Response({"detail": "La póliza no tiene fecha de inicio. Cargá start_date para habilitar los pagos."}, status=400)
        if getattr(policy, "premium", None) in (None, ""):
            return Response({"detail": "La póliza no tiene premium definido. Cargá un premio mensual para habilitar los pagos."}, status=400)
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
        logger.error("mp_webhook_rejected", extra={"reason": err})
        return Response({'detail': err}, status=403)

    # Notificación clásica (propia) o oficial de MP
    payload = request.data or {}
    mp_payment_id = payload.get('mp_payment_id') or payload.get("data", {}).get("id") or payload.get("id")
    status_str = payload.get('status')
    pid = payload.get('payment_id') or payload.get("external_reference")
    preference_id = payload.get('mp_preference_id') or payload.get("preference_id")
    amount_raw = payload.get('amount')

    # Si viene id de MP y hay token, consultamos a MP para validar
    payment_info = None
    if mp_payment_id:
        payment_info, fetch_err = _mp_fetch_payment(mp_payment_id)
        if payment_info:
            status_str = payment_info.get("status") or status_str
            pid = pid or payment_info.get("external_reference")
            amount_raw = amount_raw or payment_info.get("transaction_amount")
            preference_id = preference_id or payment_info.get("order", {}).get("id") or payment_info.get("metadata", {}).get("preference_id")
        elif fetch_err:
            return Response({"detail": fetch_err}, status=502)

    if not pid:
        return Response({'detail':'payment_id/external_reference requerido'}, status=400)

    try:
        payment = Payment.objects.get(id=pid)
    except Payment.DoesNotExist:
        return Response({'detail':'payment_id inválido'}, status=400)

    if preference_id and payment.mp_preference_id and preference_id != payment.mp_preference_id:
        return Response({'detail':'mp_preference_id no coincide'}, status=400)

    # Validar monto si viene informado
    if amount_raw is not None:
        try:
            incoming_amount = Decimal(str(amount_raw))
            if payment.amount and incoming_amount != Decimal(str(payment.amount)):
                return Response({'detail': 'El monto informado no coincide con el pago registrado.'}, status=400)
        except Exception:
            return Response({'detail': 'Monto inválido en webhook.'}, status=400)

    # Idempotencia: si ya está aprobado con el mismo mp_payment_id, devolvemos ok.
    if payment.state == 'APR' and payment.mp_payment_id and mp_payment_id and payment.mp_payment_id == mp_payment_id:
        return Response({'detail': 'ok'})

    payment.mp_payment_id = mp_payment_id or payment.mp_payment_id
    status_norm = (status_str or "").lower()
    if status_norm == 'approved':
        payment.state = 'APR'
        policy = payment.policy
        policy.status = 'active'
        policy.save(update_fields=["status", "updated_at"])
        mark_cycle_installment_paid(policy, payment=payment)
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
        logger.info(
            "mp_webhook_payment_approved",
            extra={
                "payment_id": payment.id,
                "policy_id": policy.id,
                "mp_payment_id": mp_payment_id,
                "amount": float(payment.amount),
            },
        )
    elif status_norm == 'rejected':
        payment.state = 'REJ'
        payment.save(update_fields=["mp_payment_id", "state"])
        logger.info(
            "mp_webhook_payment_rejected",
            extra={"payment_id": payment.id, "policy_id": payment.policy_id, "mp_payment_id": mp_payment_id},
        )
    else:
        payment.state = 'PEN'
        payment.save(update_fields=["mp_payment_id", "state"])
        logger.info(
            "mp_webhook_payment_pending",
            extra={"payment_id": payment.id, "policy_id": payment.policy_id, "mp_payment_id": mp_payment_id},
        )

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
    if not charge:
        premium = getattr(policy, "premium", None) or getattr(getattr(policy, "product", None), "base_price", None)
        if premium in (None, 0, ""):
            return Response({"detail": "La póliza no tiene premio definido para cobrar."}, status=400)
        charge = Charge.objects.create(
            policy=policy,
            concept="Cuota del período",
            amount=premium,
            due_date=payment_end or today,
            status="pending",
        )

    # Usamos estrictamente el monto de la cuota pendiente
    amount = charge.amount
    concept = charge.concept or "Pago manual"

    charge.status = "paid"
    if not charge.due_date:
        charge.due_date = payment_end or today
    charge.save()
    receipt = Receipt.objects.create(
        policy=policy,
        charge=charge,
        amount=amount,
        concept=concept,
        method="manual",
        auth_code=f"admin:{request.user.id if request.user.is_authenticated else 'unknown'}",
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
    # Cuota del ciclo marcada como pagada para reflejarlo al usuario
    mark_cycle_installment_paid(policy, payment=pay_obj)
    rel_path = generate_receipt_pdf(pay_obj)
    if rel_path:
        pay_obj.receipt_pdf.name = rel_path
        pay_obj.save(update_fields=["receipt_pdf"])
        receipt.file.name = rel_path
        receipt.save(update_fields=["file"])

    return Response({"detail": "Pago registrado manualmente.", "receipt_id": receipt.id})
