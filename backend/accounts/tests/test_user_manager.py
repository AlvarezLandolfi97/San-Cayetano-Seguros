from django.test import TestCase
from django.contrib.auth import get_user_model


User = get_user_model()


class UserManagerTests(TestCase):
    def test_create_superuser_sets_flags_and_normalizes_email(self):
        user = User.objects.create_superuser(
            dni="99999999",
            email="ADMIN@Example.COM",
            password="secure123!",
        )
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_active)
        self.assertEqual(user.email, "admin@example.com")

    def test_create_superuser_requires_email(self):
        with self.assertRaisesMessage(ValueError, "El email es obligatorio"):
            User.objects.create_superuser(dni="88888888", email="", password="123")

    def test_create_superuser_flags_must_be_true(self):
        with self.assertRaisesMessage(ValueError, "Superuser debe tener is_staff=True"):
            User.objects.create_superuser(
                dni="77777777",
                email="a@example.com",
                password="pass",
                is_staff=False,
            )

    def test_create_user_normalizes_email(self):
        user = User.objects.create_user(
            dni="12345678",
            email="User@Example.Net",
            password="testpass",
        )
        self.assertEqual(user.email, "user@example.net")
