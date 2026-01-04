from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient

User = get_user_model()


class CommonRoutingSlashCompatibilityTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            dni="99900000",
            email="routing-admin@example.com",
            password="AdminRouting123",
        )
        self.client = APIClient()

    def test_contact_info_aliases_exist(self):
        for path in ("/api/common/contact-info", "/api/common/contact-info/"):
            res = self.client.get(path)
            self.assertNotEqual(res.status_code, 404, f"{path} should not be 404")

    def test_admin_settings_aliases_exist(self):
        self.client.force_authenticate(user=self.admin)
        for path in ("/api/common/admin/settings", "/api/common/admin/settings/"):
            res = self.client.get(path)
            self.assertNotEqual(res.status_code, 404, f"{path} should not be 404")
