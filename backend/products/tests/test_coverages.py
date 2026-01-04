from decimal import Decimal

from django.test import TestCase

from products.models import Product
from products.serializers import HomeProductSerializer
from products.utils import parse_coverages_markdown


class CoveragesUtilsTests(TestCase):
    def test_parse_coverages_markdown_keeps_valid_lines(self):
        markdown = """
- Item uno
  - Sub item accidental
• Item dos
*Item tres

Cuatro sin marcador
"""
        parsed = parse_coverages_markdown(markdown)
        self.assertEqual(parsed, ["Item uno", "Item dos", "Item tres", "Cuatro sin marcador"])

    def test_parse_coverages_markdown_limits_results(self):
        markdown = "\n".join(f"- Item {i}" for i in range(1, 15))
        parsed = parse_coverages_markdown(markdown, limit=5)
        self.assertEqual(len(parsed), 5)


class HomeProductSerializerCoveragesTests(TestCase):
    def setUp(self):
        self.common = {
            "vehicle_type": "AUTO",
            "plan_type": "RC",
            "base_price": Decimal("50.00"),
        }

    def test_serializer_parses_coverages_markdown(self):
        product = Product.objects.create(
            code="COV1",
            name="Plan Markdown",
            coverages="- Uno\n- Dos",
            **self.common,
        )
        data = HomeProductSerializer(product).data
        self.assertEqual(data["coverages_lite"], ["Uno", "Dos"])

    def test_serializer_falls_back_to_bullets_when_markdown_empty(self):
        product = Product.objects.create(
            code="COV2",
            name="Plan Con Bullets",
            coverages="",
            bullets=["Primero", "", "Segundo"],
            **self.common,
        )
        data = HomeProductSerializer(product).data
        self.assertEqual(data["coverages_lite"], ["Primero", "Segundo"])
