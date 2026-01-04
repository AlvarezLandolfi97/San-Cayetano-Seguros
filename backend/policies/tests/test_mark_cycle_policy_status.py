from datetime import date, timedelta

from django.test import TestCase

from payments.models import Payment
from policies.billing import mark_cycle_installment_paid, regenerate_installments
from policies.models import Policy, PolicyInstallment
from products.models import Product


class MarkCyclePolicyStatusTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            code="STATUS-MARK",
            name="Status Mark Test",
            vehicle_type="AUTO",
            plan_type="RC",
            min_year=1990,
            max_year=2100,
            base_price=12000,
            coverages="",
        )
        self.start_date = date.today()

    def _create_policy(self, status: str) -> Policy:
        policy = Policy.objects.create(
            number=f"MK-{status}",
            product=self.product,
            premium=12000,
            start_date=self.start_date,
            end_date=self.start_date + timedelta(days=90),
            status=status,
        )
        self._regenerate(policy)
        return policy

    def _regenerate(self, policy: Policy):
        regenerate_installments(policy)

    def _target_installment(self, policy: Policy) -> PolicyInstallment:
        return policy.installments.order_by("sequence").first()

    def _create_payment(self, policy: Policy, installment: PolicyInstallment) -> Payment:
        period = f"{installment.period_start_date.year}{str(installment.period_start_date.month).zfill(2)}"
        return Payment.objects.create(
            policy=policy,
            installment=installment,
            period=period,
            amount=installment.amount,
        )

    def test_expired_policy_reactivates_after_single_payment(self):
        policy = self._create_policy("expired")
        target = self._target_installment(policy)
        policy.installments.exclude(id=target.id).update(status=PolicyInstallment.Status.PAID)
        target.status = PolicyInstallment.Status.EXPIRED
        target.save(update_fields=["status"])

        payment = self._create_payment(policy, target)
        mark_cycle_installment_paid(policy, payment=payment)
        policy.refresh_from_db()
        self.assertEqual(policy.status, "active")

    def test_cancelled_policy_status_unchanged_after_payment(self):
        policy = self._create_policy("cancelled")
        target = self._target_installment(policy)
        target.status = PolicyInstallment.Status.EXPIRED
        target.save(update_fields=["status"])

        payment = self._create_payment(policy, target)
        mark_cycle_installment_paid(policy, payment=payment)
        policy.refresh_from_db()
        self.assertEqual(policy.status, "cancelled")

    def test_policy_remains_expired_if_other_expired_installments_exist(self):
        policy = self._create_policy("expired")
        installments = list(policy.installments.all())
        for inst in installments:
            inst.status = PolicyInstallment.Status.EXPIRED
            inst.save(update_fields=["status"])

        target = installments[0]
        payment = self._create_payment(policy, target)
        mark_cycle_installment_paid(policy, payment=payment)
        policy.refresh_from_db()
        self.assertEqual(policy.status, "expired")
