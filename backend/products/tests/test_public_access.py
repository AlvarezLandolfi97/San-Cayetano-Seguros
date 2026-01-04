from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Product


class ProductsHomeSoftAuthTests(APITestCase):
    def setUp(self):
        Product.objects.create(
            name="SoftAuth Product",
            subtitle="",
            vehicle_type="AUTO",
            plan_type="RC",
            base_price=Decimal("120.00"),
            coverages="Cobertura básica",
            published_home=True,
            is_active=True,
        )
        self.url = "/api/products/home"

    def test_products_home_allows_missing_bearer_token(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_products_home_allows_invalid_bearer_token(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer garbled.token")
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
