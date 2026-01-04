from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from common.models import AppSettings
from payments.models import Payment
from policies.billing import (
    _add_months,
    _cycle_dates_for_period,
    regenerate_installments,
)
from policies.models import Policy, PolicyInstallment
from policies.serializers import PolicySerializer
from products.models import Product


class InstallmentSyncTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            code="SYNC-TEST",
            name="Sync Test",
            vehicle_type="AUTO",
            plan_type="RC",
            base_price=Decimal("10000.00"),
            coverages="",
        )

    def _create_policy(self, number: str, *, premium: Decimal, start: date, end: date) -> Policy:
        return Policy.objects.create(
            number=number,
            product=self.product,
            premium=premium,
            status="active",
            start_date=start,
            end_date=end,
        )

    def test_paid_installment_survives_regeneration(self):
        policy = self._create_policy(
            "SC-SYNC-PAID",
            premium=Decimal("12000.00"),
            start=date(2023, 1, 1),
            end=date(2023, 4, 1),
        )
        regenerate_installments(policy)
        first = policy.installments.order_by("sequence").first()
        payment = Payment.objects.create(
            policy=policy,
            installment=first,
            period="202301",
            amount=first.amount,
            state="APR",
        )
        first.mark_paid(payment=payment)
        original_paid_at = first.paid_at

        policy.premium = Decimal("15000.00")
        policy.end_date = _add_months(policy.start_date, 5)
        policy.save()

        regenerate_installments(policy)
        policy.refresh_from_db()
        first.refresh_from_db()

        self.assertEqual(payment.installment_id, first.id)
        self.assertEqual(first.paid_at, original_paid_at)
        self.assertEqual(policy.installments.count(), 5)
        for inst in policy.installments.exclude(id=first.id):
            self.assertEqual(inst.amount, Decimal("15000.00"))
            self.assertNotEqual(inst.status, PolicyInstallment.Status.PAID)

    def test_extra_unpaid_installments_removed_paid_kept(self):
        policy = self._create_policy(
            "SC-SYNC-UNPAID",
            premium=Decimal("11000.00"),
            start=date(2024, 1, 1),
            end=date(2024, 4, 1),
        )
        regenerate_installments(policy)

        settings = AppSettings.get_solo()
        window_days = max(1, getattr(settings, "payment_window_days", 5) or 5)
        display_offset = max(0, getattr(settings, "client_expiration_offset_days", 0) or 0)

        paid_start = _add_months(policy.start_date, 8)
        paid_cycle = _cycle_dates_for_period(
            paid_start,
            payment_window_days=window_days,
            display_offset_days=display_offset,
        )
        paid_extra = PolicyInstallment.objects.create(
            policy=policy,
            sequence=99,
            period_start_date=paid_start,
            period_end_date=paid_cycle["period_end"],
            payment_window_start=paid_cycle["payment_window_start"],
            payment_window_end=paid_cycle["payment_window_end"],
            due_date_display=paid_cycle["due_display"],
            due_date_real=paid_cycle["due_real"],
            amount=policy.premium,
            status=PolicyInstallment.Status.PAID,
            paid_at=timezone.now(),
        )

        pending_start = _add_months(policy.start_date, 9)
        pending_cycle = _cycle_dates_for_period(
            pending_start,
            payment_window_days=window_days,
            display_offset_days=display_offset,
        )
        pending_extra = PolicyInstallment.objects.create(
            policy=policy,
            sequence=100,
            period_start_date=pending_start,
            period_end_date=pending_cycle["period_end"],
            payment_window_start=pending_cycle["payment_window_start"],
            payment_window_end=pending_cycle["payment_window_end"],
            due_date_display=pending_cycle["due_display"],
            due_date_real=pending_cycle["due_real"],
            amount=policy.premium,
            status=PolicyInstallment.Status.PENDING,
        )

        regenerate_installments(policy, months_duration=3)
        policy.refresh_from_db()

        self.assertTrue(PolicyInstallment.objects.filter(id=paid_extra.id).exists())
        self.assertFalse(PolicyInstallment.objects.filter(id=pending_extra.id).exists())
        self.assertEqual(policy.installments.count(), 4)

    def test_paid_installment_sequence_immutable_when_shrinking(self):
        policy = self._create_policy(
            "SC-SYNC-IMMUTABLE",
            premium=Decimal("13000.00"),
            start=date(2024, 1, 1),
            end=date(2024, 12, 1),
        )
        regenerate_installments(policy)
        last = policy.installments.order_by("-sequence").first()
        payment = Payment.objects.create(
            policy=policy,
            installment=last,
            period=f"{last.period_start_date.year}{str(last.period_start_date.month).zfill(2)}",
            amount=last.amount,
            state="APR",
        )
        last.mark_paid(payment=payment)

        paid_seq = last.sequence
        paid_id = last.id
        # Regenerate with fewer months (shrinking plan). Should not touch paid installment.
        regenerate_installments(policy, months_duration=1)
        paid = PolicyInstallment.objects.get(id=paid_id)
        self.assertEqual(paid.sequence, paid_seq)
        self.assertEqual(paid.status, PolicyInstallment.Status.PAID)

    def test_paid_stray_sequence_shifted_before_sync(self):
        policy = self._create_policy(
            "SC-SYNC-STRAY",
            premium=Decimal("12500.00"),
            start=date(2024, 1, 1),
            end=date(2024, 6, 1),
        )
        regenerate_installments(policy)
        settings = AppSettings.get_solo()
        window_days = max(1, getattr(settings, "payment_window_days", 5) or 5)
        display_offset = max(0, getattr(settings, "client_expiration_offset_days", 0) or 0)
        stray_start = _add_months(policy.start_date, 8)
        stray_cycle = _cycle_dates_for_period(
            stray_start,
            payment_window_days=window_days,
            display_offset_days=display_offset,
        )
        first = policy.installments.order_by("sequence").first()
        first.period_start_date = stray_start
        first.period_end_date = stray_cycle["period_end"]
        first.payment_window_start = stray_cycle["payment_window_start"]
        first.payment_window_end = stray_cycle["payment_window_end"]
        first.due_date_display = stray_cycle["due_display"]
        first.due_date_real = stray_cycle["due_real"]
        first.status = PolicyInstallment.Status.PAID
        first.paid_at = timezone.now()
        first.save(update_fields=["period_start_date", "period_end_date", "payment_window_start", "payment_window_end", "due_date_display", "due_date_real", "status", "paid_at"])
        stray = first

        regenerate_installments(policy, months_duration=3)
        expected = policy.installments.filter(period_start_date=policy.start_date).first()
        self.assertEqual(expected.sequence, 1)
        stray.refresh_from_db()
        self.assertGreater(stray.sequence, 3)
        self.assertEqual(stray.status, PolicyInstallment.Status.PAID)

    def test_cycle_dates_cross_month(self):
        start = date(2026, 1, 30)
        cycle = _cycle_dates_for_period(
            start,
            payment_window_days=5,
            display_offset_days=3,
        )
        self.assertEqual(cycle["payment_window_end"], date(2026, 2, 4))
        self.assertEqual(cycle["due_real"], cycle["payment_window_end"])
        self.assertEqual(cycle["due_display"], date(2026, 2, 1))

    def test_due_display_clamp(self):
        start = date(2026, 6, 15)
        cycle = _cycle_dates_for_period(
            start,
            payment_window_days=3,
            display_offset_days=10,
        )
        self.assertEqual(cycle["payment_window_end"], date(2026, 6, 18))
        self.assertEqual(cycle["due_display"], start)

    def test_default_end_date_applied(self):
        settings = AppSettings.get_solo()
        settings.default_term_months = 4
        settings.save()
        serializer = PolicySerializer(
            data={
                "number": "SC-DEF-001",
                "product_id": self.product.id,
                "premium": Decimal("15000.00"),
                "start_date": date(2025, 3, 10),
            }
        )
        serializer.is_valid(raise_exception=True)
        policy = serializer.save()
        policy.refresh_from_db()
        self.assertEqual(policy.end_date, _add_months(policy.start_date, 4))

    def test_installment_window_matches_settings(self):
        settings = AppSettings.get_solo()
        settings.payment_window_days = 5
        settings.client_expiration_offset_days = 2
        settings.save()
        policy = self._create_policy("SC-WINDOW", premium=Decimal("14000.00"), start=date(2025, 12, 1), end=date(2026, 3, 1))
        regenerate_installments(policy)
        for inst in policy.installments.all():
            expected_end = inst.period_start_date + timedelta(days=5)
            self.assertEqual(inst.payment_window_start, inst.period_start_date)
            self.assertEqual(inst.payment_window_end, expected_end)
            self.assertEqual(inst.due_date_real, expected_end)
            self.assertEqual(inst.due_date_display, expected_end - timedelta(days=2))

    def test_cross_month_window_handles_short_month(self):
        settings = AppSettings.get_solo()
        settings.payment_window_days = 5
        settings.client_expiration_offset_days = 2
        settings.save()
        policy = self._create_policy("SC-WINDOW-X", premium=Decimal("15000.00"), start=date(2026, 1, 31), end=date(2026, 4, 30))
        regenerate_installments(policy)
        first = policy.installments.order_by("sequence").first()
        self.assertEqual(first.payment_window_start, first.period_start_date)
        self.assertEqual(first.payment_window_end, date(2026, 2, 5))
        self.assertEqual(first.due_date_real, date(2026, 2, 5))
        self.assertEqual(first.due_date_display, date(2026, 2, 3))
