from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model

from products.models import Product
from policies.models import Policy


User = get_user_model()


class PolicyPermissionsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            dni="60000000",
            email="owner@example.com",
            password="OwnerPass123",
        )
        self.admin = User.objects.create_user(
            dni="60000001",
            email="admin@example.com",
            password="AdminPass123",
            is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        product = Product.objects.create(
            code="PERM",
            name="Permisos",
            vehicle_type="AUTO",
            plan_type="TR",
            min_year=1990,
            max_year=2100,
            base_price=12000,
            coverages="",
        )
        self.policy = Policy.objects.create(
            number="SC-PERM-1",
            product=product,
            premium=12000,
            status="active",
            user=self.user,
        )

    def test_owner_cannot_access_admin_route(self):
        url = reverse("admin-policies-detail", args=[self.policy.id])
        res = self.client.get(url)
        self.assertEqual(res.status_code, 403)

    def test_owner_can_retrieve_via_client_route(self):
        url = reverse("policies-detail", args=[self.policy.id])
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

    def test_admin_can_access_admin_route(self):
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin)
        url = reverse("admin-policies-detail", args=[self.policy.id])
        res = admin_client.get(url)
        self.assertEqual(res.status_code, 200)
