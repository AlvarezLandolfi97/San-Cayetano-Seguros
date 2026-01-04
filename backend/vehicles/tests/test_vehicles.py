from django.db import IntegrityError, transaction
from django.test import TransactionTestCase

from accounts.models import User
from vehicles.models import Vehicle


class LicensePlateUniquenessTests(TransactionTestCase):
    def setUp(self):
        self.user_one = User.objects.create_user(dni="100", email="user1@example.com", password="pass123")
        self.user_two = User.objects.create_user(dni="101", email="user2@example.com", password="pass123")

    def _create_vehicle(self, owner, license_plate):
        return Vehicle.objects.create(
            owner=owner,
            license_plate=license_plate,
            vtype="AUTO",
            brand="TestBrand",
            model="TestModel",
            year=2024,
            use="Particular",
            fuel="Nafta",
        )

    def test_license_plate_unique_case_insensitive_per_owner(self):
        self._create_vehicle(self.user_one, "aa123bb")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self._create_vehicle(self.user_one, " AA123BB ")
        self.assertEqual(Vehicle.objects.filter(owner=self.user_one).count(), 1)

    def test_same_plate_for_different_owners_is_allowed(self):
        self._create_vehicle(self.user_one, "AA123BB")
        self._create_vehicle(self.user_two, "aa123bb")
        self.assertEqual(Vehicle.objects.count(), 2)
