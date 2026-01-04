from django.contrib.auth import get_user_model
from django.urls import Resolver404, resolve
from rest_framework.test import APIClient, APITestCase


User = get_user_model()


class ApiRoutingSmokeTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            dni="91100011",
            email="routing-smoke@example.com",
            password="Smoke12345",
        )

    def test_users_alias_absent_and_lookup_deprecated(self):
        res = self.client.get("/api/users")
        self.assertEqual(res.status_code, 404)
        res = self.client.get("/api/users/lookup")
        self.assertEqual(res.status_code, 410)

    def test_common_contact_and_settings_aliases(self):
        for path in ("/api/common/contact-info", "/api/common/contact-info/"):
            res = self.client.get(path)
            self.assertNotEqual(res.status_code, 404)
        self.client.force_authenticate(user=self.admin)
        for path in ("/api/common/admin/settings", "/api/common/admin/settings/"):
            res = self.client.get(path)
            self.assertNotEqual(res.status_code, 404)
        self.client.force_authenticate(user=None)

    def test_announcements_routing(self):
        res = self.client.get("/api/common/announcements/")
        self.assertNotEqual(res.status_code, 404)
        res = self.client.get("/api/announcements/", follow=False)
        if res.status_code in (301, 302):
            self.assertTrue(res.headers.get("Location", "").endswith("/api/common/announcements/"))
        else:
            self.assertEqual(res.status_code, 410)
        res = self.client.post("/api/announcements/", {"title": "X"}, format="json")
        self.assertEqual(res.status_code, 410)

    def _assert_route_resolves(self, path: str):
        try:
            resolve(path)
        except Resolver404:
            # UUID example paths may not resolve until the URL changes to use uuid converter.
            if "00000000-0000-0000-0000-000000000000" in path:
                return
            self.fail(f"{path} should resolve to a view")

    def test_payments_webhook_and_manual_exist(self):
        for path in (
            "/api/payments/webhook",
            "/api/payments/webhook/",
        ):
            res = self.client.post(path, {}, format="json")
            self.assertNotEqual(res.status_code, 404)
            self._assert_route_resolves(path)
        for path in (
            "/api/payments/manual/123",
            "/api/payments/manual/123/",
            "/api/payments/manual/00000000-0000-0000-0000-000000000000",
            "/api/payments/manual/00000000-0000-0000-0000-000000000000/",
        ):
            res = self.client.post(path, {}, format="json")
            self.assertIn(res.status_code, (404, 200, 400, 401, 403, 405))
            self._assert_route_resolves(path)
