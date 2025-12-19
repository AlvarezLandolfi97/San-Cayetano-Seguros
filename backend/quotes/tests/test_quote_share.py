import base64
from rest_framework.test import APITestCase


TINY_PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kWSsAAAAASUVORK5CYII="
)


class QuoteShareTests(APITestCase):
    def _valid_payload(self, photos):
        return {
            "plan_code": "TEST",
            "plan_name": "Test Plan",
            "phone": "123456789",
            "make": "VW",
            "model": "Gol",
            "version": "1.6",
            "year": 2020,
            "city": "La Plata",
            "has_garage": True,
            "is_zero_km": False,
            "usage": "privado",
            "has_gnc": False,
            "photos": photos,
        }

    def test_quote_share_upload_ok(self):
        payload = self._valid_payload(
            {"front": TINY_PNG, "back": TINY_PNG, "right": TINY_PNG, "left": TINY_PNG}
        )
        res = self.client.post("/api/quotes/share", payload, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertIn("id", res.data)

    def test_quote_share_rejects_oversized_image(self):
        big_bytes = b"a" * (6 * 1024 * 1024)  # 6MB
        big_b64 = base64.b64encode(big_bytes).decode()
        big_data_url = f"data:image/png;base64,{big_b64}"
        payload = self._valid_payload(
            {"front": big_data_url, "back": TINY_PNG, "right": TINY_PNG, "left": TINY_PNG}
        )
        res = self.client.post("/api/quotes/share", payload, format="json")
        self.assertEqual(res.status_code, 400)
