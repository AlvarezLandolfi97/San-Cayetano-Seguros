from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model
from accounts.serializers import UserSerializer

User = get_user_model()


class UserPermissionsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            dni="70000000",
            email="user@example.com",
            password="UserPass123",
            first_name="User",
            last_name="Tester",
        )
        self.admin = User.objects.create_superuser(
            dni="80000000",
            email="admin@example.com",
            password="AdminPass123",
            first_name="Admin",
            last_name="Tester",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_regular_user_cannot_list_users(self):
        for url in ("/api/users", "/api/accounts/users"):
            res = self.client.get(url)
            expected = 404 if url == "/api/users" else 403
            self.assertEqual(res.status_code, expected)

    def test_regular_user_can_access_me(self):
        res = self.client.get("/api/accounts/users/me")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["email"], self.user.email)

    def test_regular_user_can_patch_me(self):
        payload = {"first_name": "Updated"}
        res = self.client.patch("/api/accounts/users/me", payload, format="json")
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Updated")

    def test_regular_user_cannot_change_email_or_active(self):
        payload = {"email": "hacked@example.com", "is_active": False}
        res = self.client.patch("/api/accounts/users/me", payload, format="json")
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "user@example.com")
        self.assertTrue(self.user.is_active)

    def test_regular_user_can_change_password(self):
        payload = {"password": "NewPass123"}
        res = self.client.patch("/api/accounts/users/me", payload, format="json")
        self.assertEqual(res.status_code, 200)
        self.client.logout()
        login_res = self.client.post("/api/auth/login", {"email": "user@example.com", "password": "NewPass123"})
        self.assertEqual(login_res.status_code, 200)

    def test_admin_can_update_email_and_active(self):
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin)
        payload = {"email": "updated@example.com", "is_active": False}
        res = admin_client.patch(f"/api/accounts/users/{self.user.id}", payload, format="json")
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "updated@example.com")
        self.assertFalse(self.user.is_active)

    def test_serializer_create_ignores_is_active_without_admin(self):
        data = {
            "dni": "12345678",
            "email": "new@example.com",
            "password": "Pass1234",
            "is_active": False,
        }
        serializer = UserSerializer(data=data, context={"allow_policy_ids": False})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        self.assertTrue(user.is_active)

    def test_admin_can_list_users(self):
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin)
        res = admin_client.get("/api/accounts/users")
        self.assertEqual(res.status_code, 200)
        emails = {u["email"] for u in res.data}
        ids = {u["id"] for u in res.data}
        self.assertIn(self.user.email, emails)
        self.assertIn(self.admin.email, emails)
        self.assertIn(self.admin.id, ids)
