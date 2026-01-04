from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model


User = get_user_model()


class LegacyUsersAliasTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            dni="90000000",
            email="legacy@example.com",
            password="LegacyPass123",
        )

    def test_lookup_still_410(self):
        res = self.client.get("/api/users/lookup?email=legacy@example.com")
        self.assertEqual(res.status_code, 410)
        self.assertEqual(res.data.get("detail"), "Endpoint deprecated.")

    def test_users_root_returns_404(self):
        res = self.client.get("/api/users")
        self.assertEqual(res.status_code, 404)

    def test_users_detail_returns_404(self):
        res = self.client.get(f"/api/users/{self.user.id}")
        self.assertEqual(res.status_code, 404)
