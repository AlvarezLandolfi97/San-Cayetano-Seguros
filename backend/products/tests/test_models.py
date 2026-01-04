from decimal import Decimal
from django.db import IntegrityError
from django.test import TestCase

from products.models import Product


class ProductCodeTests(TestCase):
    def setUp(self):
        self.common_kwargs = {
            "subtitle": "",
            "vehicle_type": "AUTO",
            "plan_type": "RC",
            "base_price": Decimal("100.00"),
            "coverages": "Cobertura básica",
        }

    def test_auto_generates_code_when_missing_and_keeps_unique(self):
        first = Product.objects.create(name="Plan Test", **self.common_kwargs)
        second = Product.objects.create(name="Plan Test", **self.common_kwargs)
        self.assertTrue(first.code)
        self.assertTrue(second.code)
        self.assertNotEqual(first.code.lower(), second.code.lower())
        self.assertEqual(first.code, first.code.upper())
        self.assertEqual(second.code, second.code.upper())

    def test_duplicate_code_case_insensitive_raises(self):
        Product.objects.create(code="PLANX", name="Plan X", **self.common_kwargs)
        with self.assertRaises(IntegrityError):
            Product.objects.create(code="planx", name="Plan X", **self.common_kwargs)
