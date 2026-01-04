from datetime import date, timedelta
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from products.models import Product
from policies.models import Policy, PolicyInstallment


class PolicyReadActionsSideEffectTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            dni="70000001",
            email="owner-refresh@example.com",
            password="OwnerPass123",
        )
        product = Product.objects.create(
            code="REFRESH",
            name="Refresh Plan",
            vehicle_type="AUTO",
            plan_type="TR",
            min_year=2010,
            max_year=2100,
            base_price=20000,
            coverages="Cobertura de prueba",
        )
        self.policy = Policy.objects.create(
            number="SC-REF-1",
            product=product,
            premium=20000,
            status="active",
            user=self.user,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today() + timedelta(days=335),
        )
        PaymentWindowStart = date.today() - timedelta(days=60)
        PolicyInstallment.objects.create(
            policy=self.policy,
            sequence=1,
            period_start_date=PaymentWindowStart,
            payment_window_start=PaymentWindowStart,
            payment_window_end=PaymentWindowStart + timedelta(days=10),
            due_date_display=PaymentWindowStart + timedelta(days=5),
            due_date_real=PaymentWindowStart + timedelta(days=8),
            amount=Decimal("1500"),
            status=PolicyInstallment.Status.PENDING,
        )
        self.client.force_authenticate(user=self.user)

    def test_list_get_does_not_persist_policy_changes(self):
        previous_updated = self.policy.updated_at
        url = reverse("policies-my")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.policy.refresh_from_db()
        self.assertEqual(self.policy.updated_at, previous_updated)
        installment = self.policy.installments.first()
        self.assertEqual(installment.status, PolicyInstallment.Status.PENDING)


class PolicyRefreshActionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            dni="70000002",
            email="refresh-action@example.com",
            password="OwnerPass123",
        )
        product = Product.objects.create(
            code="REFRESH2",
            name="Refresh Plan 2",
            vehicle_type="AUTO",
            plan_type="TR",
            min_year=2010,
            max_year=2100,
            base_price=21000,
            coverages="Cobertura de prueba",
        )
        self.policy = Policy.objects.create(
            number="SC-REF-2",
            product=product,
            premium=21000,
            status="active",
            user=self.user,
            start_date=date.today() - timedelta(days=400),
            end_date=date.today() - timedelta(days=30),
        )
        overdue_start = date.today() - timedelta(days=90)
        self.installment = PolicyInstallment.objects.create(
            policy=self.policy,
            sequence=1,
            period_start_date=overdue_start,
            payment_window_start=overdue_start,
            payment_window_end=overdue_start + timedelta(days=10),
            due_date_display=overdue_start + timedelta(days=5),
            due_date_real=overdue_start + timedelta(days=8),
            amount=Decimal("1500"),
            status=PolicyInstallment.Status.PENDING,
        )
        self.client.force_authenticate(user=self.user)

    def test_refresh_action_updates_installments_and_policy(self):
        url = reverse("policies-refresh", args=[self.policy.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.installment.refresh_from_db()
        self.assertEqual(self.installment.status, PolicyInstallment.Status.EXPIRED)
        self.policy.refresh_from_db()
        self.assertEqual(self.policy.status, "expired")

    def test_refresh_action_populates_missing_installments(self):
        PolicyInstallment.objects.filter(policy=self.policy).delete()
        url = reverse("policies-refresh", args=[self.policy.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.policy.refresh_from_db()
        self.assertGreater(self.policy.installments.count(), 0)
