from datetime import date, timedelta

from django.test import TestCase

from products.models import Product
from policies.billing import update_policy_status_from_installments
from policies.models import Policy, PolicyInstallment


class PolicyStatusTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            code="STAT-TEST",
            name="Status Test",
            vehicle_type="AUTO",
            plan_type="RC",
            min_year=1990,
            max_year=2100,
            base_price=10000,
            coverages="",
        )
        self.start_date = date(2024, 1, 1)

    def _create_policy(self, status: str) -> Policy:
        return Policy.objects.create(
            number=f"ST-{status}",
            product=self.product,
            premium=10000,
            start_date=self.start_date,
            end_date=self.start_date + timedelta(days=90),
            status=status,
        )

    def _add_installment(self, policy: Policy, status: str) -> PolicyInstallment:
        return PolicyInstallment.objects.create(
            policy=policy,
            sequence=1,
            period_start_date=self.start_date,
            period_end_date=self.start_date + timedelta(days=29),
            payment_window_start=self.start_date,
            payment_window_end=self.start_date + timedelta(days=5),
            due_date_display=self.start_date + timedelta(days=5),
            due_date_real=self.start_date + timedelta(days=7),
            amount=policy.premium,
            status=status,
        )

    def test_cancelled_status_not_overwritten(self):
        policy = self._create_policy("cancelled")
        self._add_installment(policy, PolicyInstallment.Status.PENDING)
        result = update_policy_status_from_installments(policy, policy.installments.all(), persist=True)
        self.assertEqual(result, "cancelled")
        policy.refresh_from_db()
        self.assertEqual(policy.status, "cancelled")

    def test_suspended_status_not_overwritten(self):
        policy = self._create_policy("suspended")
        self._add_installment(policy, PolicyInstallment.Status.EXPIRED)
        result = update_policy_status_from_installments(policy, policy.installments.all(), persist=True)
        self.assertEqual(result, "suspended")
        policy.refresh_from_db()
        self.assertEqual(policy.status, "suspended")

    def test_active_becomes_expired_on_expired_installment(self):
        policy = self._create_policy("active")
        self._add_installment(policy, PolicyInstallment.Status.EXPIRED)
        result = update_policy_status_from_installments(policy, policy.installments.all(), persist=True)
        self.assertEqual(result, "expired")
        policy.refresh_from_db()
        self.assertEqual(policy.status, "expired")

    def test_expired_reactivates_when_all_installments_clear(self):
        policy = self._create_policy("expired")
        self._add_installment(policy, PolicyInstallment.Status.PAID)
        result = update_policy_status_from_installments(policy, policy.installments.all(), persist=True)
        self.assertEqual(result, "active")
        policy.refresh_from_db()
        self.assertEqual(policy.status, "active")

    def test_function_is_idempotent(self):
        policy = self._create_policy("active")
        self._add_installment(policy, PolicyInstallment.Status.PAID)
        first = update_policy_status_from_installments(policy, policy.installments.all(), persist=True)
        second = update_policy_status_from_installments(policy, policy.installments.all(), persist=True)
        self.assertEqual(first, second)
        policy.refresh_from_db()
        self.assertEqual(policy.status, "active")
