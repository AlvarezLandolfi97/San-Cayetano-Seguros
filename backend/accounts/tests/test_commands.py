from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.test import TestCase

User = get_user_model()


class PromoteUserToAdminCommandTests(TestCase):
    def setUp(self):
        self.email = "user@example.com"
        self.user = User.objects.create_user(
            dni="50000000",
            email=self.email,
            password="temp1234",
            first_name="User",
            last_name="Example",
            is_staff=False,
            is_superuser=False,
        )

    def test_missing_user_raises(self):
        with self.assertRaises(CommandError):
            call_command("promote_user_to_admin", email="missing@example.com")

    def test_promote_sets_flags(self):
        output = StringIO()
        call_command("promote_user_to_admin", email=self.email, stdout=output)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_staff)
        self.assertTrue(self.user.is_superuser)
        self.assertIn("Updated user", output.getvalue())

    def test_command_is_idempotent(self):
        first = StringIO()
        second = StringIO()
        call_command("promote_user_to_admin", email=self.email, stdout=first)
        call_command("promote_user_to_admin", email=self.email, stdout=second)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_staff)
        self.assertTrue(self.user.is_superuser)
        self.assertIn("→True", first.getvalue())
        self.assertIn("→True", second.getvalue())
