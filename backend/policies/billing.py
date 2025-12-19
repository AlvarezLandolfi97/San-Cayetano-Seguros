# backend/policies/billing.py
from __future__ import annotations

from datetime import date, timedelta
from django.utils import timezone
from decimal import Decimal
from typing import Iterable, List, Optional, Sequence

from django.db import transaction

from common.models import AppSettings
from .models import Policy, PolicyInstallment
from calendar import monthrange


def _add_months(start: date, months: int) -> date:
    """
    Sum month intervals keeping the day when possible. When the target month
    does not have that day (e.g., 31 -> February), fallback to the last day.
    """
    if months == 0:
        return start
    year = start.year + (start.month - 1 + months) // 12
    month = (start.month - 1 + months) % 12 + 1
    # Cap day to last day of target month
    from calendar import monthrange

    last_day = monthrange(year, month)[1]
    return date(year, month, min(start.day, last_day))


def _months_between(start: date, end: date) -> int:
    """
    Number of whole months between start (inclusive) and end (exclusive).
    Used to derive the amount of installments between start_date and end_date.
    """
    if end <= start:
        return 0
    months = 0
    cursor = start
    while cursor < end:
        months += 1
        cursor = _add_months(cursor, 1)
    return months


def compute_installment_status(installment: PolicyInstallment, today: Optional[date] = None) -> str:
    """
    Stateless status derivation following the requested rules:
    - If already paid, keep PAID.
    - If today <= payment_window_end (vencimiento adelantado) -> PENDING
    - If payment_window_end < today <= due_date_real -> NEAR_DUE (aún puede pagar)
    - If today > due_date_real -> EXPIRED
    """
    if installment.status == PolicyInstallment.Status.PAID:
        return installment.status
    today = today or date.today()
    pw_end = installment.payment_window_end
    real_due = installment.due_date_real
    if pw_end and today <= pw_end:
        return PolicyInstallment.Status.PENDING
    if real_due and today <= real_due:
        return PolicyInstallment.Status.NEAR_DUE
    return PolicyInstallment.Status.EXPIRED


def _cycle_dates_for_period(period_start: date, *, payment_window_days: int, display_offset_days: int):
    """
    Calcula las fechas clave de un período mensual tomando como ancla el día
    de creación de la póliza:
    - La ventana de pago arranca el mismo día del start_date (clamp al mes).
    - Vencimiento real: start_day + payment_window_days (incluye el día de inicio).
    - Vencimiento visible: real - display_offset (no menor al start_day).
    """
    year = period_start.year
    month = period_start.month
    last_day = monthrange(year, month)[1]

    start_day = min(period_start.day, last_day)
    payment_start = date(year, month, start_day)

    real_day = min(start_day + payment_window_days, last_day)
    due_real = date(year, month, real_day)

    display_day = max(start_day, real_day - display_offset_days)
    payment_end = date(year, month, display_day)

    return {
        "period_end": _add_months(period_start, 1) - timedelta(days=1),
        "payment_window_start": payment_start,
        "payment_window_end": payment_end,
        "due_display": payment_end,
        "due_real": due_real,
    }


def _build_installments(
    policy: Policy,
    months_duration: int,
    monthly_amount: Decimal,
    payment_window_days: int,
    display_offset_days: int,
) -> List[PolicyInstallment]:
    if months_duration <= 0 or not policy.start_date:
        return []
    installments: List[PolicyInstallment] = []
    start = policy.start_date
    window_days = max(1, payment_window_days)
    display_offset = max(0, display_offset_days)
    for idx in range(months_duration):
        period_start = _add_months(start, idx)
        cycle = _cycle_dates_for_period(
            period_start,
            payment_window_days=window_days,
            display_offset_days=display_offset,
        )

        installments.append(
            PolicyInstallment(
                policy=policy,
                sequence=idx + 1,
                period_start_date=period_start,
                period_end_date=cycle["period_end"],
                payment_window_start=cycle["payment_window_start"],
                payment_window_end=cycle["payment_window_end"],
                due_date_display=cycle["due_display"],
                due_date_real=cycle["due_real"],
                amount=monthly_amount,
                status=PolicyInstallment.Status.PENDING,
            )
        )
    return installments


def months_duration_for_policy(policy: Policy) -> int:
    """
    Derives months of coverage. Prefers explicit end_date/start_date; falls back
    to app default term if the end_date is missing.
    """
    settings_obj = AppSettings.get_solo()
    if policy.start_date and policy.end_date:
        return _months_between(policy.start_date, policy.end_date)
    return getattr(settings_obj, "default_term_months", 3) or 3


def regenerate_installments(
    policy: Policy,
    *,
    months_duration: Optional[int] = None,
    monthly_amount: Optional[Decimal] = None,
) -> Sequence[PolicyInstallment]:
    """
    Idempotently recreates the installments of a policy. Useful when a policy
    is created or its vigency changes. The operation is wrapped in a
    transaction to avoid partially duplicated rows.
    """
    settings_obj = AppSettings.get_solo()
    months = months_duration if months_duration is not None else months_duration_for_policy(policy)
    amount = monthly_amount if monthly_amount is not None else (policy.premium or Decimal("0"))
    display_offset = getattr(settings_obj, "client_expiration_offset_days", 0) or 0

    with transaction.atomic():
        policy.installments.all().delete()
        installments = _build_installments(
            policy,
            months_duration=months,
            monthly_amount=amount,
            payment_window_days=getattr(settings_obj, "payment_window_days", 5) or 5,
            display_offset_days=max(0, display_offset),
        )
        PolicyInstallment.objects.bulk_create(installments)
    return policy.installments.all()


def current_payment_cycle(
    policy: Policy,
    settings_obj: AppSettings,
    *,
    today: Optional[date] = None,
) -> Optional[dict]:
    """
    Devuelve las fechas de la cuota vigente (o la última conocida) siguiendo
    las preferencias configurables.
    """
    if not policy.start_date:
        return None
    today = today or date.today()
    months_to_generate = max(months_duration_for_policy(policy), 1)
    window_days = max(1, getattr(settings_obj, "payment_window_days", 5) or 5)
    display_offset = max(0, getattr(settings_obj, "client_expiration_offset_days", 0) or 0)

    cycle: Optional[dict] = None
    for idx in range(months_to_generate):
        period_start = _add_months(policy.start_date, idx)
        cycle = {
            "period_start": period_start,
            **_cycle_dates_for_period(
                period_start,
                payment_window_days=window_days,
                display_offset_days=display_offset,
            ),
        }
        if cycle["due_real"] >= today:
            break
    return cycle


def next_price_update_window(
    policy: Policy,
    settings_obj: AppSettings,
    *,
    today: Optional[date] = None,
) -> tuple[Optional[date], Optional[date]]:
    """
    Calcula la ventana en la que el admin puede actualizar el precio antes del
    próximo período (ej: cada 3 meses, los 3 días previos).
    """
    today = today or date.today()
    anchor = policy.start_date or today
    every_months = max(1, getattr(settings_obj, "price_update_every_months", 0) or 1)
    offset_days = max(0, getattr(settings_obj, "price_update_offset_days", 0) or 0)

    next_start = None
    months_step = every_months
    attempts = 0
    while attempts < 120:  # hard stop para evitar loops
        candidate = _add_months(anchor, months_step)
        if candidate >= today:
            next_start = candidate
            break
        months_step += every_months
        attempts += 1

    if not next_start:
        return None, None

    return next_start - timedelta(days=offset_days), next_start - timedelta(days=1)


def mark_cycle_installment_paid(
    policy: Policy,
    payment=None,
    *,
    today: Optional[date] = None,
) -> Optional[PolicyInstallment]:
    """
    Marca la cuota correspondiente al ciclo vigente como pagada y la asocia
    al Payment recibido. Si no hay cuota del ciclo, toma la primera pendiente.
    """
    today = today or date.today()
    settings_obj = AppSettings.get_solo()
    cycle = current_payment_cycle(policy, settings_obj, today=today) or {}
    period_start = cycle.get("period_start")
    qs = policy.installments.all()
    target = None
    if period_start:
        target = qs.filter(period_start_date=period_start).order_by("sequence").first()
    if not target:
        target = qs.filter(status__in=[PolicyInstallment.Status.PENDING, PolicyInstallment.Status.NEAR_DUE]).order_by("sequence").first()
    if not target:
        target = qs.filter(status=PolicyInstallment.Status.EXPIRED).order_by("sequence").first()
    if not target:
        return None
    target.mark_paid(payment=payment, when=timezone.now())
    return target


def refresh_installment_statuses(installments: Iterable[PolicyInstallment], *, persist: bool = False) -> None:
    """
    Updates the `status` field in memory (and optionally in DB) using
    compute_installment_status. This keeps the API aligned without needing a
    cron job right away.
    """
    to_update: List[PolicyInstallment] = []
    today = date.today()
    for inst in installments:
        new_status = compute_installment_status(inst, today=today)
        if inst.status != new_status:
            inst.status = new_status
            if persist:
                to_update.append(inst)
    if persist and to_update:
        PolicyInstallment.objects.bulk_update(to_update, ["status", "updated_at"])


def derive_policy_billing_status(installments: Iterable[PolicyInstallment]) -> str:
    """
    Collapse installment statuses into a single billing status for quick UI
    grouping.
    """
    has_expired = False
    has_near_due = False
    for inst in installments:
        status = inst.status
        if status == PolicyInstallment.Status.EXPIRED:
            has_expired = True
            break
        if status == PolicyInstallment.Status.NEAR_DUE:
            has_near_due = True
    if has_expired:
        return "expired"
    if has_near_due:
        return "near_due"
    return "on_track"


def update_policy_status_from_installments(
    policy: Policy,
    installments: Iterable[PolicyInstallment],
    *,
    persist: bool = False,
) -> str:
    """
    Ajusta el estado general de la póliza según sus cuotas:
    - Si alguna cuota está vencida (sin pagar) -> policy.status = expired
    - Si no hay vencidas, permanece en su estado actual (o active si estaba active).
    Estados finales cancelados/inactivos/suspendidos no se sobreescriben aquí.
    """
    frozen_statuses = {"cancelled", "inactive", "suspended"}
    current = getattr(policy, "status", "active") or "active"
    if current in frozen_statuses:
        return current

    billing_status = derive_policy_billing_status(installments)
    new_status = current
    if billing_status == "expired":
        new_status = "expired"
    elif current == "expired" and billing_status != "expired":
        # si se pagó todo, reactivamos a active
        new_status = "active"

    if persist and new_status != current:
        policy.status = new_status
        policy.save(update_fields=["status", "updated_at"])
    return new_status
