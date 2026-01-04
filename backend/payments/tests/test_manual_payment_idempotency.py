from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient

from products.models import Product
from policies.billing import regenerate_installments
from policies.models import Policy
from payments.models import Payment, Receipt


User = get_user_model()


class ManualPaymentIdempotencyTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            dni="91000000",
            email="manual-admin@example.com",
            password="AdminManual123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        self.product = Product.objects.create(
            code="MAN-RT",
            name="Manual Routing Plan",
            vehicle_type="AUTO",
            plan_type="RC",
            min_year=1990,
            max_year=2100,
            base_price=11000,
            coverages="",
        )
        self.policy = Policy.objects.create(
            number="MAN-1",
            user=self.admin,
            product=self.product,
            premium=11000,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            status="active",
        )
        regenerate_installments(self.policy)

    def _call_manual(self):
        return self.client.post(f"/api/payments/manual/{self.policy.id}", format="json")

    def test_manual_payment_is_idempotent(self):
        first = self._call_manual()
        self.assertEqual(first.status_code, 200)
        self.assertEqual(Payment.objects.filter(policy=self.policy, mp_payment_id="manual").count(), 1)
        self.assertEqual(Receipt.objects.filter(policy=self.policy, method="manual").count(), 1)
        self.assertEqual(first.data["policy_status"], self.policy.status)

        second = self._call_manual()
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["detail"], "Pago manual ya registrado.")
        self.assertEqual(second.data["policy_status"], self.policy.status)
        self.assertEqual(Payment.objects.filter(policy=self.policy, mp_payment_id="manual").count(), 1)
        self.assertEqual(Receipt.objects.filter(policy=self.policy, method="manual").count(), 1)

    def test_manual_payment_allows_admin_managed_status(self):
        self.policy.status = "cancelled"
        self.policy.save(update_fields=["status"])
        res = self._call_manual()
        self.assertEqual(res.status_code, 200)
        self.assertIn("La póliza permanece cancelled", res.data["detail"])
        self.assertEqual(res.data["policy_status"], self.policy.status)
        self.assertEqual(Payment.objects.filter(policy=self.policy).count(), 1)
        self.assertEqual(Receipt.objects.filter(policy=self.policy, method="manual").count(), 1)
        # second request remains idempotent
        second = self._call_manual()
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["policy_status"], self.policy.status)
        self.assertEqual(Payment.objects.filter(policy=self.policy).count(), 1)
        self.assertEqual(Receipt.objects.filter(policy=self.policy, method="manual").count(), 1)
