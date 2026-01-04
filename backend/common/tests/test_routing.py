from rest_framework.test import APITestCase

from django.urls import reverse

from common.models import Announcement, ContactInfo


class CommonRoutingTests(APITestCase):
    def test_contact_info_canonical(self):
        res = self.client.get("/api/common/contact-info/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("email", res.data)

    def test_contact_info_alias_removed(self):
        res = self.client.get("/api/contact-info/")
        self.assertEqual(res.status_code, 404)

    def test_announcements_alias_and_canonical(self):
        Announcement.objects.create(
            title="Test",
            message="Message",
            is_active=True,
        )
        canonical = self.client.get("/api/common/announcements/")
        alias = self.client.get("/api/announcements/", follow=False)
        self.assertEqual(canonical.status_code, 200)
        self.assertIn(alias.status_code, (301, 302, 410))
        if alias.status_code in (301, 302):
            self.assertTrue(alias.headers.get("Location", "").endswith("/api/common/announcements/"))
