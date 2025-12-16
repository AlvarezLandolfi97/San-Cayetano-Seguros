# backend/policies/views.py
from django.db.models import Prefetch
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Policy, PolicyVehicle
from .serializers import (
    PolicySerializer,
    PolicyClientListSerializer,
    PolicyClientDetailSerializer,
    PolicyVehicleSerializer,
)
from common.models import AppSettings
from payments.serializers import ReceiptSerializer
from payments.models import Receipt
from .billing import (
    regenerate_installments,
    refresh_installment_statuses,
    update_policy_status_from_installments,
)
import secrets
import string
from datetime import date, timedelta
from calendar import monthrange


def _gen_claim_code(length=8):
    alphabet = string.ascii_uppercase + string.digits
    return "SC-" + "".join(secrets.choice(alphabet) for _ in range(length))


def _client_end_date(end_date, settings_obj):
    if not end_date:
        return None
    offset = max(0, getattr(settings_obj, "client_expiration_offset_days", 0) or 0)
    return end_date - timedelta(days=offset)


def _policy_timeline(policy, settings_obj):
    payment_days = max(1, getattr(settings_obj, "payment_window_days", 0) or 0)
    price_offset = max(0, getattr(settings_obj, "price_update_offset_days", 0) or 0)
    client_offset = max(0, getattr(settings_obj, "client_expiration_offset_days", 0) or 0)
    # Offset real = diferencia configurada (real - display) o client_offset como fallback.
    diff_real_display = None
    try:
        dd = getattr(settings_obj, "payment_due_day_display", None)
        dr = getattr(settings_obj, "payment_due_day_real", None)
        if dd is not None and dr is not None and dr >= dd:
            diff_real_display = dr - dd
    except Exception:
        diff_real_display = None

    anchor = getattr(policy, "start_date", None) or date.today()
    today = date.today()

    first_payment_start = anchor
    payment_start = None
    payment_end = None
    real_due = getattr(policy, "end_date", None)
    client_due = _client_end_date(real_due, settings_obj)

    if first_payment_start and (not real_due or today <= real_due):
        def _months_between(start, current):
            return (current.year - start.year) * 12 + (current.month - start.month)

        idx = max(0, _months_between(first_payment_start, today) - 1)
        candidate = _add_months(first_payment_start, idx)

        from calendar import monthrange

        while candidate:
            year = candidate.year
            month = candidate.month
            last_day = monthrange(year, month)[1]
            # Ventana dinámica: arranca el mismo día de inicio (clamp al mes) y dura payment_days.
            start_day = min(candidate.day, last_day)
            payment_start = date(year, month, start_day)
            payment_end = date(year, month, min(start_day + payment_days - 1, last_day))
            real_offset = diff_real_display if diff_real_display is not None else client_offset
            real_day = min(payment_end.day + real_offset, last_day) if real_offset is not None else payment_end.day
            real_due = date(year, month, max(real_day, payment_end.day))

            if payment_end >= today:
                break
            idx += 1
            candidate = _add_months(first_payment_start, idx)

    price_anchor = getattr(policy, "end_date", None)
    price_update_from = price_anchor - timedelta(days=price_offset) if price_anchor else None
    price_update_to = price_anchor - timedelta(days=1) if price_anchor else None

    return {
        "real_end_date": real_due,
        "client_end_date": client_due,
        "payment_start_date": payment_start,
        "payment_end_date": payment_end,
        "price_update_from": price_update_from,
        "price_update_to": price_update_to,
    }


def _client_status(status, client_end, real_end, payment_end=None):
    if status in ["cancelled", "inactive", "suspended"]:
        return status
    today = date.today()
    # normalizamos fechas
    if isinstance(real_end, str):
        try:
            real_end = date.fromisoformat(real_end)
        except ValueError:
            real_end = None
    if isinstance(payment_end, str):
        try:
            payment_end = date.fromisoformat(payment_end)
        except ValueError:
            payment_end = None
    if real_end and real_end < today:
        return "expired"
    if client_end and client_end < today:
        return "no_coverage"
    return status or "active"


def _add_months(start_date, months):
    """
    Suma meses conservando el día cuando es posible; si el mes de destino
    no tiene ese día (p. ej., 31 a febrero), se usa el último día del mes.
    """
    if not start_date or not months:
        return None
    year = start_date.year + (start_date.month - 1 + months) // 12
    month = (start_date.month - 1 + months) % 12 + 1
    day = start_date.day
    last_day = monthrange(year, month)[1]
    return date(year, month, min(day, last_day))


def _date_in_window(start, end, today=None):
    today = today or date.today()
    if not start or not end:
        return False
    if isinstance(start, str):
        try:
            start = date.fromisoformat(start)
        except ValueError:
            return False
    if isinstance(end, str):
        try:
            end = date.fromisoformat(end)
        except ValueError:
            return False
    return start <= today <= end


class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(user.is_staff or obj.user_id == user.id)


class PolicyViewSet(viewsets.ModelViewSet):
    serializer_class = PolicySerializer

    def get_queryset(self):
        return (
            Policy.objects.select_related("user", "product", "vehicle")
            .prefetch_related(
                Prefetch("vehicle", queryset=PolicyVehicle.objects.all()),
                "installments",
            )
            .order_by("-id")
        )

    def get_permissions(self):
        if self.action in ["my", "claim"]:
            return [permissions.IsAuthenticated()]
        if self.action in ["retrieve", "receipts"]:
            return [permissions.IsAuthenticated(), IsOwnerOrAdmin()]
        if self.action in ["list", "create", "update", "partial_update", "destroy"]:
            return [permissions.IsAdminUser()]
        return [permissions.IsAdminUser()]

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        # filtros admin: search por number o plate, solo sin usuario
        q = (request.query_params.get("search") or "").strip()
        if q:
            qs = qs.filter(number__icontains=q) | qs.filter(vehicle__plate__icontains=q)
        only_unassigned = (request.query_params.get("only_unassigned") or "").lower() in ("1", "true", "yes")
        if only_unassigned:
            qs = qs.filter(user__isnull=True)
        # client_end_date derivado
        settings_obj = AppSettings.get_solo()
        policies = list(qs)
        for policy in policies:
            if not policy.installments.exists() and policy.start_date:
                regenerate_installments(policy)
            refresh_installment_statuses(policy.installments.all(), persist=True)
            update_policy_status_from_installments(policy, policy.installments.all(), persist=True)
        timeline_map = {p.id: _policy_timeline(p, settings_obj) for p in policies}
        serializer = PolicySerializer(policies, many=True, context={"timeline_map": timeline_map})
        data = serializer.data
        page = int(request.query_params.get("page") or 1)
        page_size = int(request.query_params.get("page_size") or 0)
        if page_size > 0:
            start = (page - 1) * page_size
            end = start + page_size
            return Response({
                "results": data[start:end],
                "count": len(data),
                "page": page,
                "page_size": page_size,
            })
        return Response(data)

    @action(detail=False, methods=["get"], url_path="my")
    def my(self, request):
        user = request.user
        settings_obj = AppSettings.get_solo()
        policies = list(self.get_queryset().filter(user=user))
        for policy in policies:
            refresh_installment_statuses(policy.installments.all(), persist=True)
            update_policy_status_from_installments(policy, policy.installments.all(), persist=True)
        timeline_map = {p.id: _policy_timeline(p, settings_obj) for p in policies}
        serializer = PolicyClientListSerializer(
            policies,
            many=True,
            context={"timeline_map": timeline_map},
        )
        data = serializer.data
        for item in data:
            timeline = timeline_map.get(item["id"], {})
            cid = timeline.get("client_end_date")
            item["client_end_date"] = cid
            item["payment_start_date"] = timeline.get("payment_start_date")
            item["payment_end_date"] = timeline.get("payment_end_date")
            item["price_update_from"] = timeline.get("price_update_from")
            item["status"] = _client_status(
                item["status"],
                cid,
                timeline.get("real_end_date"),
                timeline.get("payment_end_date"),
            )
        return Response(data)

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        self.check_object_permissions(request, obj)
        settings_obj = AppSettings.get_solo()
        refresh_installment_statuses(obj.installments.all(), persist=True)
        update_policy_status_from_installments(obj, obj.installments.all(), persist=True)
        timeline = _policy_timeline(obj, settings_obj)
        serializer = PolicyClientDetailSerializer(
            obj, context={"timeline_map": {obj.id: timeline}}
        )
        data = serializer.data
        cid = timeline.get("client_end_date")
        data["client_end_date"] = cid
        data["status"] = _client_status(
            data.get("status"),
            cid,
            timeline.get("real_end_date"),
            timeline.get("payment_end_date"),
        )
        return Response(data)

    @action(detail=True, methods=["get"], url_path="receipts")
    def receipts(self, request, pk=None):
        policy = self.get_object()
        qs = Receipt.objects.filter(policy=policy).order_by("-date", "-id")
        return Response(ReceiptSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=False, methods=["post"], url_path="claim")
    def claim(self, request):
        number = (request.data.get("number") or request.data.get("code") or "").strip()
        if not number:
            return Response({"detail": "Ingresá un número de póliza válido."}, status=400)
        try:
            policy = Policy.objects.select_related("vehicle", "product").get(number__iexact=number)
        except Policy.DoesNotExist:
            return Response({"detail": "No encontramos una póliza con ese número. Revisá e intentá de nuevo."}, status=404)

        # Ya asociada con el mismo usuario
        if policy.user_id == request.user.id:
            return Response({"detail": "Esta póliza ya está asociada a tu cuenta."}, status=400)

        # Asociada a otra persona
        if policy.user_id and policy.user_id != request.user.id:
            return Response({"detail": "Esta póliza ya pertenece a otro usuario."}, status=400)

        policy.user = request.user
        if not policy.claim_code:
            policy.claim_code = _gen_claim_code()
        policy.save(update_fields=["user", "claim_code", "updated_at"])
        product = policy.product
        vehicle = getattr(policy, "vehicle", None)
        payload = {
            "id": policy.id,
            "number": policy.number,
            "product": {"id": product.id, "name": product.name} if product else None,
            "vehicle": PolicyVehicleSerializer(vehicle).data if vehicle else {},
            "status": policy.status,
            "status_readable": "Activa" if policy.status == "active" else policy.status,
            "plate": getattr(vehicle, "plate", None),
        }
        return Response({"message": "¡Póliza asociada!", "policy": payload})

    def _apply_default_end_date(self, serializer):
        """
        Si se envía fecha de inicio sin fecha de fin, aplicamos duración por defecto.
        """
        data = serializer.validated_data
        start = data.get("start_date")
        end = data.get("end_date")
        if start and (end is None or end == ""):
            settings_obj = AppSettings.get_solo()
            months = getattr(settings_obj, "default_term_months", 0) or 0
            if months > 0:
                computed = _add_months(start, months)
                if computed:
                    serializer.save(end_date=computed)
                    return True
        return False

    def perform_create(self, serializer):
        if not self._apply_default_end_date(serializer):
            serializer.save()

    def perform_update(self, serializer):
        settings_obj = AppSettings.get_solo()
        data = serializer.validated_data
        instance = serializer.instance

        # Si se actualiza el monto dentro de la ventana de ajuste, se arranca un nuevo período:
        premium_changed = "premium" in data
        prev_end = getattr(instance, "end_date", None)
        timeline = _policy_timeline(instance, settings_obj)
        in_price_window = _date_in_window(
            timeline.get("price_update_from"),
            timeline.get("price_update_to"),
        )
        if premium_changed and prev_end and in_price_window:
            term_months = getattr(settings_obj, "default_term_months", None)
            if not term_months:
                term_months = getattr(settings_obj, "price_update_every_months", 0) or 3
            new_start = prev_end
            new_end = _add_months(prev_end, term_months)
            data["start_date"] = new_start
            data["end_date"] = new_end

        if not self._apply_default_end_date(serializer):
            serializer.save()
