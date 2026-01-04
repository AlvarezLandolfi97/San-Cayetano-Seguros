from django.core import mail
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class PasswordResetPublicAccessTests(APITestCase):
    def setUp(self):
        self.url = "/api/auth/password/reset"
        self.user = User.objects.create_user(
            dni="22222222",
            email="reset-test@example.com",
            password="StrongPass123!",
        )

    def tearDown(self):
        mail.outbox.clear()

    def test_password_reset_request_public_without_jwt(self):
        response = self.client.post(self.url, {"email": self.user.email}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

    def test_password_reset_request_public_with_invalid_jwt(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid.token")
        response = self.client.post(self.url, {"email": self.user.email}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
