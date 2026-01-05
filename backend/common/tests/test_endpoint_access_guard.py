from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, override_settings
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from common.authentication import SoftJWTAuthentication
from common.security import EndpointAccessGuardMixin, PublicEndpointMixin


class SoftJWTAuthenticationForGuard(SoftJWTAuthentication):
    def __init__(self):
        super().__init__(purpose=SoftJWTAuthentication.PURPOSE_PUBLIC)


class PrivateWithSoftAuth(EndpointAccessGuardMixin, APIView):
    endpoint_access = "private"
    authentication_classes = [SoftJWTAuthenticationForGuard]
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"ok": True})


class PublicWriteWithoutHint(PublicEndpointMixin, APIView):
    def post(self, request):
        return Response({"ok": True})


class PublicReadOnly(PublicEndpointMixin, APIView):
    def get(self, request):
        return Response({"ok": True})


class EndpointAccessGuardTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @override_settings(DEBUG=True)
    def test_private_endpoint_rejects_soft_auth_in_debug(self):
        view = PrivateWithSoftAuth.as_view()
        request = self.factory.get("/fake")
        with self.assertRaises(ImproperlyConfigured):
            view(request)

    @override_settings(DEBUG=True)
    def test_public_endpoint_requires_public_write_allowed_for_posts(self):
        view = PublicWriteWithoutHint.as_view()
        request = self.factory.post("/fake", {"foo": "bar"}, format="json")
        with self.assertRaises(ImproperlyConfigured):
            view(request)

    def test_public_read_only_stays_operational(self):
        view = PublicReadOnly.as_view()
        request = self.factory.get("/fake")
        response = view(request)
        self.assertEqual(response.status_code, 200)
