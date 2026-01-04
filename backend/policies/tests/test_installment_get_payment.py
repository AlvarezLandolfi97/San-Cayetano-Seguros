from datetime import date, timedelta

from django.test import TestCase

from policies.models import Policy, PolicyInstallment
from products.models import Product
from policies.billing import regenerate_installments
from policies.serializers import PolicySerializer, PolicyInstallmentSerializer


class InstallmentGetPaymentTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            code="GETPAY",
            name="GetPayment Plan",
            vehicle_type="AUTO",
            plan_type="RC",
            min_year=1990,
            max_year=2100,
            base_price=15000,
            coverages="",
        )
        self.policy = Policy.objects.create(
            number="GETPAY-1",
            product=self.product,
            premium=15000,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=60),
            status="active",
        )
        regenerate_installments(self.policy)

    def test_serializer_returns_null_when_payment_unset(self):
        data = PolicySerializer(self.policy).data
        installments = data["installments"]
        self.assertEqual(len(installments), self.policy.installments.count())
        for installment in installments:
            self.assertIsNone(installment["payment"])

    def test_get_payment_uses_cached_attribute(self):
        installment = self.policy.installments.first()
        installment._payment_id = None
        serializer = PolicyInstallmentSerializer()
        payment = serializer.get_payment(installment)
        self.assertIsNone(payment)
