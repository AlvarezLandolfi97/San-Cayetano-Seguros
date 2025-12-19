from unittest import mock
from datetime import date, timedelta

from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model

from products.models import Product
from policies.models import Policy
from payments.models import Payment, Charge


User = get_user_model()


class CreatePreferenceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            dni="50000000", email="pay@example.com", password="PayPass123"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.product = Product.objects.create(
            code="PAY",
            name="Plan Pago",
            vehicle_type="AUTO",
            plan_type="TR",
            min_year=1990,
            max_year=2100,
            base_price=15000,
            coverages="",
        )
        self.policy = Policy.objects.create(
            number="POL-PAY-1",
            user=self.user,
            product=self.product,
            premium=15000,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            status="active",
        )
        self.charge = Charge.objects.create(
            policy=self.policy,
            concept="Cuota del período",
            amount=15000,
            due_date=date.today() + timedelta(days=5),
            status="pending",
        )

    @mock.patch.dict("os.environ", {"MP_ACCESS_TOKEN": "dummy"})
    @mock.patch("payments.views._mp_create_preference")
    def test_create_preference_success(self, mock_mp_create):
        mock_mp_create.return_value = ({"id": "pref-1", "init_point": "http://pay"}, "")
        url = f"/api/payments/policies/{self.policy.id}/create_preference"
        res = self.client.post(
            url,
            {"period": "202501", "charge_ids": [self.charge.id]},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(Payment.objects.filter(policy=self.policy).exists())
        payment = Payment.objects.filter(policy=self.policy).latest("id")
        self.assertEqual(payment.mp_preference_id, "pref-1")

    @mock.patch.dict("os.environ", {"MP_ACCESS_TOKEN": "dummy"})
    @mock.patch("payments.views._mp_create_preference")
    def test_create_preference_failure_removes_payment(self, mock_mp_create):
        mock_mp_create.return_value = (None, "error de MP")
        url = f"/api/payments/policies/{self.policy.id}/create_preference"
        res = self.client.post(
            url,
            {"period": "202501", "charge_ids": [self.charge.id]},
            format="json",
        )
        self.assertEqual(res.status_code, 502)
        self.assertEqual(Payment.objects.filter(policy=self.policy).count(), 0)
