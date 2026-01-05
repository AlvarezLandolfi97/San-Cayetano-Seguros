import os
from unittest import mock

from django.test import override_settings
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, APITestCase

from payments.views import _authorize_mp_webhook


class MpWebhookAuthorizationTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @override_settings(
        DEBUG=False,
        REST_FRAMEWORK={"DEFAULT_AUTHENTICATION_CLASSES": [], "DEFAULT_PERMISSION_CLASSES": []},
    )
    @mock.patch.dict(os.environ, {"MP_WEBHOOK_SECRET": ""}, clear=False)
    def test_missing_secret_in_production_returns_503(self):
        request = self.factory.post("/api/payments/webhook", {})
        ok, detail, status_code = _authorize_mp_webhook(request)
        self.assertFalse(ok)
        self.assertEqual(status_code, 503)
        self.assertIn("MP_WEBHOOK_SECRET requerido", detail)
        response = Response({"detail": detail}, status=status_code or 403)
        self.assertEqual(response.status_code, 503)

    @override_settings(
        DEBUG=True,
        REST_FRAMEWORK={"DEFAULT_AUTHENTICATION_CLASSES": [], "DEFAULT_PERMISSION_CLASSES": []},
    )
    @mock.patch.dict(
        os.environ,
        {"MP_WEBHOOK_SECRET": "", "MP_ALLOW_WEBHOOK_NO_SECRET": "true"},
        clear=False,
    )
    def test_debug_allows_missing_secret(self):
        request = self.factory.post("/api/payments/webhook", {})
        ok, detail, status_code = _authorize_mp_webhook(request)
        self.assertTrue(ok)
        self.assertEqual(status_code, 200)

    @override_settings(
        DEBUG=False,
        REST_FRAMEWORK={"DEFAULT_AUTHENTICATION_CLASSES": [], "DEFAULT_PERMISSION_CLASSES": []},
    )
    @mock.patch.dict(os.environ, {"MP_WEBHOOK_SECRET": "test-secret"}, clear=False)
    def test_secret_requires_matching_signature(self):
        request = self.factory.post(
            "/api/payments/webhook",
            {},
            HTTP_X_MP_SIGNATURE="test-secret",
        )
        ok, detail, status_code = _authorize_mp_webhook(request)
        self.assertTrue(ok)
        self.assertEqual(status_code, 200)

    @override_settings(
        DEBUG=False,
        REST_FRAMEWORK={"DEFAULT_AUTHENTICATION_CLASSES": [], "DEFAULT_PERMISSION_CLASSES": []},
    )
    @mock.patch.dict(os.environ, {"MP_WEBHOOK_SECRET": "test-secret"}, clear=False)
    def test_secret_rejects_missing_signature(self):
        request = self.factory.post("/api/payments/webhook", {})
        ok, detail, status_code = _authorize_mp_webhook(request)
        self.assertFalse(ok)
        self.assertEqual(status_code, 403)
        self.assertIn("Falta firma", detail)

    @override_settings(
        DEBUG=False,
        REST_FRAMEWORK={"DEFAULT_AUTHENTICATION_CLASSES": [], "DEFAULT_PERMISSION_CLASSES": []},
    )
    @mock.patch.dict(
        os.environ,
        {"MP_WEBHOOK_SECRET": "", "MP_ALLOW_WEBHOOK_NO_SECRET": "true"},
        clear=False,
    )
    def test_production_disallows_allow_no_secret_flag(self):
        request = self.factory.post("/api/payments/webhook", {})
        ok, detail, status_code = _authorize_mp_webhook(request)
        self.assertFalse(ok)
        self.assertEqual(status_code, 503)
        self.assertIn("MP_WEBHOOK_SECRET requerido", detail)
