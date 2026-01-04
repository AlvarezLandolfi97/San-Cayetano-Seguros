from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient

from policies.billing import _add_months
from policies.models import Policy

from common.models import ContactInfo, AppSettings


User = get_user_model()


class ContactInfoViewTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            dni="90000000",
            email="admin-contact@example.com",
            password="AdminContact123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_patch_contact_info_updates_fields_without_terms(self):
        payload = {"whatsapp": "new-whatsapp"}
        res = self.client.patch("/api/common/contact-info/", payload, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(ContactInfo.get_solo().whatsapp, "new-whatsapp")


class AppSettingsDefaultTermTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            dni="91000000",
            email="admin-settings@example.com",
            password="AdminSettings123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)
        self.active_policy = Policy.objects.create(
            number="POL-TERM-1",
            start_date=date(2023, 1, 1),
            end_date=_add_months(date(2023, 1, 1), 3),
            status="active",
        )
        self.cancelled_policy = Policy.objects.create(
            number="POL-TERM-2",
            start_date=date(2023, 1, 1),
            end_date=_add_months(date(2023, 1, 1), 3),
            status="cancelled",
        )
        AppSettings.get_solo().default_term_months = 3
        AppSettings.get_solo().save()

    def test_default_term_change_regenerates_installments(self):
        with patch("common.views.regenerate_installments") as mock_regen:
            res = self.client.patch(
                "/api/common/admin/settings",
                {"default_term_months": 6},
                format="json",
            )
        self.assertEqual(res.status_code, 200)
        self.active_policy.refresh_from_db()
        self.cancelled_policy.refresh_from_db()
        self.assertEqual(self.active_policy.end_date, _add_months(self.active_policy.start_date, 6))
        self.assertEqual(self.cancelled_policy.end_date, _add_months(self.cancelled_policy.start_date, 3))
        mock_regen.assert_called_once_with(self.active_policy, months_duration=6)

    def test_admin_managed_policies_are_skipped(self):
        with patch("common.views.regenerate_installments") as mock_regen:
            res = self.client.patch(
                "/api/common/admin/settings",
                {"default_term_months": 4},
                format="json",
            )
        self.assertEqual(res.status_code, 200)
        self.cancelled_policy.refresh_from_db()
        self.active_policy.refresh_from_db()
        self.assertEqual(self.cancelled_policy.end_date, _add_months(self.cancelled_policy.start_date, 3))
        self.assertEqual(self.active_policy.end_date, _add_months(self.active_policy.start_date, 4))
        mock_regen.assert_called_once_with(self.active_policy, months_duration=4)


class SingletonModelTests(TestCase):
    def test_contact_info_get_solo_is_idempotent(self):
        first = ContactInfo.get_solo()
        self.assertEqual(first.pk, ContactInfo.get_solo().pk)

    def test_contact_info_rejects_second_instance(self):
        ContactInfo.get_solo()
        with self.assertRaises(IntegrityError):
            ContactInfo.objects.create()

    def test_appsettings_get_solo_is_idempotent(self):
        first = AppSettings.get_solo()
        self.assertEqual(first.pk, AppSettings.get_solo().pk)

    def test_appsettings_rejects_second_instance(self):
        AppSettings.get_solo()
        with self.assertRaises(IntegrityError):
            AppSettings.objects.create()
