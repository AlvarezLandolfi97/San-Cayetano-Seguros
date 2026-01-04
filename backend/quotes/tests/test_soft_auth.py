from rest_framework import status
from rest_framework.test import APITestCase


class QuoteViewSoftAuthTests(APITestCase):
    def setUp(self):
        self.url = "/api/quotes/"
        self.payload = {"vtype": "AUTO", "year": 2020}

    def test_quotes_endpoint_accepts_missing_bearer(self):
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_quotes_endpoint_accepts_invalid_bearer(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
