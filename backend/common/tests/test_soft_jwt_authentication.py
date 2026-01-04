from rest_framework.test import APIClient, APITestCase

from common.models import Announcement


PUBLIC_PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ytjRr0AAAAASUVORK5CYII="


def ensure_not_forbidden(res, endpoint):
    assert res.status_code not in (401, 403), f"{endpoint} returned {res.status_code}"


class SoftJWTAuthenticationTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.invalid_token = "Bearer bad.token.value"
        self.public_announcement = Announcement.objects.create(title="Public", message="ok", is_active=True)

    def test_allow_any_endpoint_accepts_invalid_token(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.invalid_token)
        res = self.client.get("/api/common/contact-info/")
        self.assertEqual(res.status_code, 200, res.data)

    def test_public_endpoints_ignore_invalid_token(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.invalid_token)
        endpoints = [
            ("get", "/api/products/", {}),
            ("get", "/api/products/home/", {}),
            ("post", "/api/quotes/", {"vtype": "AUTO", "year": 2020}),
        ]
        for method, url, payload in endpoints:
            res = getattr(self.client, method)(url, payload, format="json")
            ensure_not_forbidden(res, f"{method.upper()} {url}")

        share_payload = {
            "phone": "1234567890",
            "make": "Ford",
            "model": "Ka",
            "version": "base",
            "year": 2020,
            "city": "BsAs",
            "has_garage": False,
            "is_zero_km": False,
            "usage": "PERSONAL",
            "has_gnc": False,
            "gnc_amount": 0,
            "photos": {
                "front": PUBLIC_PHOTO,
                "back": PUBLIC_PHOTO,
                "right": PUBLIC_PHOTO,
                "left": PUBLIC_PHOTO,
            },
        }
        share_res = self.client.post("/api/quotes/share", share_payload, format="json")
        ensure_not_forbidden(share_res, "POST /api/quotes/share")
        token = share_res.data.get("id")
        if token:
            detail_res = self.client.get(f"/api/quotes/share/{token}")
            ensure_not_forbidden(detail_res, f"GET /api/quotes/share/{token}")

        announcement_list = self.client.get("/api/common/announcements/")
        ensure_not_forbidden(announcement_list, "GET /api/common/announcements/")
        announcement_detail = self.client.get(f"/api/common/announcements/{self.public_announcement.id}/")
        ensure_not_forbidden(announcement_detail, f"GET /api/common/announcements/{self.public_announcement.id}/")

    def test_authenticated_endpoint_rejects_invalid_token(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.invalid_token)
        res = self.client.get("/api/accounts/users/me")
        self.assertEqual(res.status_code, 401)
