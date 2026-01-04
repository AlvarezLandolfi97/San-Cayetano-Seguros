from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient

from common.models import Announcement


User = get_user_model()


class AnnouncementAccessTests(APITestCase):
    def setUp(self):
        self.active = Announcement.objects.create(title="Active", message="ok", is_active=True)
        self.inactive = Announcement.objects.create(title="Inactive", message="hidden", is_active=False)
        self.client = APIClient()
        self.admin = User.objects.create_superuser(dni="900", email="admin@ex.com", password="Admin123")

    def test_public_list_only_shows_active(self):
        res = self.client.get("/api/common/announcements/")
        self.assertEqual(res.status_code, 200)
        if isinstance(res.data, dict) and "results" in res.data:
            items = res.data["results"]
        else:
            items = res.data
        self.assertIsInstance(items, list)
        ids = {item["id"] for item in items}
        self.assertIn(self.active.id, ids)
        self.assertNotIn(self.inactive.id, ids)

    def test_public_retrieve_inactive_404(self):
        res = self.client.get(f"/api/common/announcements/{self.inactive.id}/")
        self.assertEqual(res.status_code, 404)

    def test_admin_can_retrieve_inactive(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/common/announcements/{self.inactive.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["id"], self.inactive.id)
