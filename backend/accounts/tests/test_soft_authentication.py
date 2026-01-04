from rest_framework import status
from rest_framework.test import APITestCase


class PrivateEndpointSoftAuthTests(APITestCase):
    def test_me_endpoint_rejects_invalid_jwt(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer expired.token")
        response = self.client.get("/api/accounts/users/me")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
