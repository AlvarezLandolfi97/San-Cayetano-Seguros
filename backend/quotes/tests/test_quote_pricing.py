from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Product


class QuotePricingTests(APITestCase):
    def setUp(self):
        self.year = timezone.now().year - 16  # asegura factor 1.15 (edad mayor a 15 años)
        Product.objects.create(
            code="DECIMAL",
            name="Decimal Plan",
            subtitle="Plan de prueba",
            bullets=[],
            vehicle_type="AUTO",
            plan_type="TR",
            min_year=self.year,
            max_year=self.year,
            base_price=Decimal("0.10"),
            franchise="",
            coverages="Cobertura test",
            published_home=True,
            is_active=True,
        )

    def test_quote_view_uses_decimal_precision(self):
        payload = {"vtype": "AUTO", "year": self.year}
        res = self.client.post("/api/quotes/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        quoted = res.data["plans"]
        self.assertEqual(len(quoted), 1)
        expected = (Decimal("0.10") * Decimal("1.15")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        self.assertEqual(quoted[0]["estimated_price"], str(expected))
