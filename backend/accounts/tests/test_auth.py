from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient


User = get_user_model()


class AuthTests(APITestCase):
    def setUp(self):
        self.password = "StrongPass123"
        self.user = User.objects.create_user(
            dni="10000000",
            email="active@example.com",
            password=self.password,
            first_name="Active",
            last_name="User",
        )
        self.inactive = User.objects.create_user(
            dni="20000000",
            email="inactive@example.com",
            password=self.password,
            first_name="Inactive",
            last_name="User",
            is_active=False,
        )

    def test_login_success(self):
        url = reverse("auth-login")
        res = self.client.post(url, {"email": self.user.email, "password": self.password})
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["email"], self.user.email)

    def test_login_inactive_user_blocked(self):
        url = reverse("auth-login")
        res = self.client.post(url, {"email": self.inactive.email, "password": self.password})
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data.get("detail"), "La cuenta está inactiva. Contactá al administrador.")


class AdminUserCreationTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            dni="99999999",
            email="admin@example.com",
            password="AdminPass123",
            first_name="Admin",
            last_name="User",
        )
        self.client.force_authenticate(user=self.admin)

    def test_admin_creates_user_with_hashed_password(self):
        payload = {
            "dni": "30000000",
            "email": "newuser@example.com",
            "first_name": "New",
            "last_name": "User",
            "password": "UserPass123",
        }
        res = self.client.post("/api/admin/users", payload, format="json")
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email=payload["email"])
        # contraseña debe estar hasheada y check_password debe validar
        self.assertNotEqual(user.password, payload["password"])
        self.assertTrue(user.check_password(payload["password"]))
