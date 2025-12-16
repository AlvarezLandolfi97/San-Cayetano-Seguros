# backend/policies/billing.py
from __future__ import annotations

from datetime import date, datetime, timedelta
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
    - If today <= payment_window_end -> PENDING
    - If payment_window_end < today <= due_date_real -> NEAR_DUE
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


def _build_installments(
    policy: Policy,
    months_duration: int,
    monthly_amount: Decimal,
    payment_window_days: int,
    real_due_grace_days: int,
) -> List[PolicyInstallment]:
    if months_duration <= 0 or not policy.start_date:
        return []
    installments: List[PolicyInstallment] = []
    start = policy.start_date
    # Ejemplo del diagrama: vencimiento adelantado día 5, vencimiento real día 7, ventana de pago: días previos al 5.
    window_days = max(1, payment_window_days)
    grace_days = max(0, real_due_grace_days)  # 0 => vencimiento real igual al adelantado
    for idx in range(months_duration):
        period_start = _add_months(start, idx)
        period_end = _add_months(period_start, 1) - timedelta(days=1)
        year = period_start.year
        month = period_start.month
        last_day = monthrange(year, month)[1]

        # Ventana dinámica: arranca el mismo día del start_date del período y dura window_days.
        start_day = min(period_start.day, last_day)
        payment_start = date(year, month, start_day)
        payment_end_day = min(start_day + window_days - 1, last_day)
        payment_end = date(year, month, payment_end_day)

        # Vencimiento real = fin de ventana + gracia (offset real) clamped al mes.
        real_day = min(payment_end_day + grace_days, last_day)
        due_display = payment_end
        due_real = date(year, month, max(real_day, payment_end_day))

        installments.append(
            PolicyInstallment(
                policy=policy,
                sequence=idx + 1,
                period_start_date=period_start,
                period_end_date=period_end,
                payment_window_start=payment_start,
                payment_window_end=payment_end,
                due_date_display=due_display,
                due_date_real=due_real,
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
    settings_obj = AppSettings.get_solo()
    grace_from_settings = (
        (getattr(settings_obj, "payment_due_day_real", 0) or 0)
        - (getattr(settings_obj, "payment_due_day_display", 0) or 0)
    )
    if grace_from_settings <= 0:
        grace_from_settings = getattr(settings_obj, "client_expiration_offset_days", 0) or 0

    with transaction.atomic():
        policy.installments.all().delete()
        installments = _build_installments(
            policy,
            months_duration=months,
            monthly_amount=amount,
            payment_window_days=getattr(settings_obj, "payment_window_days", 5) or 5,
            real_due_grace_days=max(0, grace_from_settings),
        )
        PolicyInstallment.objects.bulk_create(installments)
    return policy.installments.all()


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
