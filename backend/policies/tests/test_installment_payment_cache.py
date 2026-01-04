from unittest import mock

from django.test import TestCase

from payments.models import Payment
from policies.models import Policy
from policies.serializers import PolicySerializer
from products.models import Product
from policies.billing import regenerate_installments
from datetime import date, timedelta


class InstallmentPaymentCacheTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            code="CACHE-TEST",
            name="Cache Test Plan",
            vehicle_type="AUTO",
            plan_type="RC",
            min_year=1990,
            max_year=2100,
            base_price=14000,
            coverages="",
        )
        self.start_date = date.today()

    def _create_policy(self) -> Policy:
        policy = Policy.objects.create(
            number="CACHE-1",
            product=self.product,
            premium=14000,
            start_date=self.start_date,
            end_date=self.start_date + timedelta(days=90),
            status="active",
        )
        regenerate_installments(policy)
        return policy

    def _attach_payment(self, policy: Policy) -> Payment:
        installment = policy.installments.order_by("sequence").first()
        period = f"{installment.period_start_date.year}{str(installment.period_start_date.month).zfill(2)}"
        return Payment.objects.create(
            policy=policy,
            installment=installment,
            period=period,
            amount=installment.amount,
        )

    def test_payment_cached_during_serialization(self):
        policy = self._create_policy()
        payment = self._attach_payment(policy)
        call_count = {"value": 0}
        original_filter = Payment.objects.filter

        def track_filter(*args, **kwargs):
            call_count["value"] += 1
            if call_count["value"] > 1:
                raise AssertionError("PolicyInstallmentSerializer queried payments more than once.")
            return original_filter(*args, **kwargs)

        with mock.patch.object(Payment.objects, "filter", side_effect=track_filter):
            data = PolicySerializer(policy).data

        installments = data["installments"]
        self.assertEqual(len(installments), policy.installments.count())
        self.assertEqual(installments[0]["payment"], payment.id)
        self.assertEqual(call_count["value"], 1)
