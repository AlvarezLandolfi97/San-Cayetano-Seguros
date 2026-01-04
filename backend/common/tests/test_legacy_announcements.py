from rest_framework.test import APITestCase

from common.models import Announcement


class LegacyAnnouncementsRoutingTests(APITestCase):
    def setUp(self):
        Announcement.objects.create(title="Legacy", message="")

    def test_legacy_list_redirects(self):
        res = self.client.get("/api/announcements/", follow=False)
        self.assertEqual(res.status_code, 301)
        self.assertEqual(res.headers.get("Location"), "/api/common/announcements/")

    def test_legacy_detail_redirects(self):
        ann = Announcement.objects.first()
        res = self.client.get(f"/api/announcements/{ann.id}/", follow=False)
        self.assertEqual(res.status_code, 301)
        self.assertEqual(res.headers.get("Location"), f"/api/common/announcements/{ann.id}/")

    def test_legacy_post_returns_gone(self):
        res = self.client.post("/api/announcements/", {"title": "x"}, format="json")
        self.assertEqual(res.status_code, 410)
        self.assertIn("deprecated", res.data["detail"])

    def test_canonical_list_still_exists(self):
        res = self.client.get("/api/common/announcements/", follow=False)
        self.assertNotEqual(res.status_code, 404)
