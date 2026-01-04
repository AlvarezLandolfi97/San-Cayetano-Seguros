from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from products.models import Product
from policies.models import Policy
from policies.billing import regenerate_installments


User = get_user_model()


class PaymentsRoutingTests(APITestCase):
    def setUp(self):
        # admin user is required by manual_payment endpoint
        self.admin = User.objects.create_superuser(
            dni="90000000",
            email="admin-payments@example.com",
            password="AdminPass123",
        )
        self.client.force_authenticate(user=self.admin)

        self.product = Product.objects.create(
            code="PAY-RT",
            name="Routing Test Plan",
            vehicle_type="AUTO",
            plan_type="TR",
            min_year=1990,
            max_year=2100,
            base_price=10000,
            coverages="",
        )
        self.policy = self._create_policy("RT-PAY-1")
        self.policy_slash = self._create_policy("RT-PAY-2")

    def _create_policy(self, number):
        policy = Policy.objects.create(
            number=number,
            user=self.admin,
            product=self.product,
            premium=10000,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            status="active",
        )
        regenerate_installments(policy)
        return policy

    def test_webhook_endpoints_exist_without_and_with_slash(self):
        for suffix in ("", "/"):
            res = self.client.post(f"/api/payments/webhook{suffix}")
            self.assertNotEqual(res.status_code, 404)

    def test_manual_endpoints_exist_without_and_with_slash(self):
        cases = [
            (self.policy, ""),
            (self.policy_slash, "/"),
        ]
        for policy, suffix in cases:
            res = self.client.post(f"/api/payments/manual/{policy.id}{suffix}")
            self.assertNotEqual(res.status_code, 404)
