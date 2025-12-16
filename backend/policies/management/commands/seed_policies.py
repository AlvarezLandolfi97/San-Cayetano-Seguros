from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand

from accounts.models import User
from policies.models import Policy, PolicyVehicle
from products.models import Product


class Command(BaseCommand):
    help = "Seed demo users and policies for local development/testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Borra polizas, vehiculos y usuarios demo antes de crear.",
        )
        parser.add_argument(
            "--reset-products",
            action="store_true",
            help="Tambien borra los productos antes de recrearlos.",
        )

    def handle(self, *args, **options):
        self.stdout.write("Creando datos de ejemplo...")
        user_data = self._user_data()
        demo_dnis = [u["dni"] for u in user_data]

        if options.get("reset"):
            self._reset_data(demo_dnis, options.get("reset_products", False))

        products = self._seed_products()
        users = self._seed_users(user_data)
        self._seed_policies(users, products)
        self.stdout.write(self.style.SUCCESS("Seed de polizas y usuarios completado."))

    def _product_data(self):
        """
        Asegura que existan algunos productos basicos.
        """
        return [
            dict(
                key="rc",
                code="AUTO-RC",
                name="Auto RC Basico",
                vehicle_type="AUTO",
                plan_type="RC",
                min_year=1995,
                max_year=2035,
                base_price=Decimal("12000"),
                franchise="-",
                coverages="- RC hasta X\n- Defensa civil",
                bullets=["Responsabilidad civil", "Defensa civil basica"],
            ),
            dict(
                key="tc",
                code="AUTO-TC",
                name="Auto Terceros Completo",
                vehicle_type="AUTO",
                plan_type="TC",
                min_year=2005,
                max_year=2035,
                base_price=Decimal("22000"),
                franchise="$50.000",
                coverages="- RC\n- Cristales\n- Granizo",
                bullets=["Cobertura de cristales", "Granizo", "Responsabilidad civil"],
            ),
            dict(
                key="tr",
                code="AUTO-TR",
                name="Auto Todo Riesgo",
                vehicle_type="AUTO",
                plan_type="TR",
                min_year=2015,
                max_year=2035,
                base_price=Decimal("42000"),
                franchise="$200.000",
                coverages="- Danos totales y parciales",
                bullets=["Todo riesgo", "Danos parciales", "Responsabilidad civil"],
            ),
        ]

    def _seed_products(self):
        product_data = self._product_data()
        product_map = {}
        for data in product_data:
            key = data.pop("key")
            product, _ = Product.objects.update_or_create(
                name=data["name"],
                defaults=data,
            )
            product_map[key] = product
        return product_map

    def _user_data(self):
        """
        Crea algunos usuarios clientes y un admin ligero.
        """
        return [
            dict(dni="10000001", first_name="Ana", last_name="Gonzalez", email="ana@example.com", phone="1130000001"),
            dict(dni="10000002", first_name="Bruno", last_name="Perez", email="bruno@example.com", phone="1130000002"),
            dict(dni="10000003", first_name="Carla", last_name="Diaz", email="carla@example.com", phone="1130000003"),
            dict(dni="20000000", first_name="Admin", last_name="Demo", email="admin@example.com", phone="1130000099", is_staff=True, is_superuser=True),
        ]

    def _seed_users(self, user_data):
        user_map = {}
        for data in user_data:
            dni = data.pop("dni")
            password = data.pop("password", "demo1234")
            user, created = User.objects.get_or_create(dni=dni, defaults=data)
            if created or not user.has_usable_password():
                user.set_password(password)
                user.save()
            user_map[dni] = user
        return user_map

    def _seed_policies(self, user_map, product_map):
        """
        Crea polizas con y sin usuario asignado, con vehiculos asociados.
        """
        today = date.today()
        policies = [
            dict(
                number="SC-1001",
                user="10000001",
                product="rc",
                premium=Decimal("15500"),
                status="active",
                start=today - timedelta(days=30),
                end=today + timedelta(days=150),
                vehicle=dict(
                    plate="ABC123",
                    make="Toyota",
                    model="Etios",
                    version="XS",
                    year=2020,
                    city="CABA",
                    has_garage=True,
                    is_zero_km=False,
                    usage="privado",
                    has_gnc=False,
                    gnc_amount=None,
                ),
            ),
            dict(
                number="SC-1002",
                user="10000002",
                product="tc",
                premium=Decimal("21500"),
                status="active",
                start=today - timedelta(days=90),
                end=today + timedelta(days=90),
                vehicle=dict(
                    plate="XYZ987",
                    make="Volkswagen",
                    model="Golf",
                    version="Comfortline",
                    year=2018,
                    city="La Plata",
                    has_garage=False,
                    is_zero_km=False,
                    usage="privado",
                    has_gnc=True,
                    gnc_amount=Decimal("60000"),
                ),
            ),
            dict(
                number="SC-1003",
                user="10000002",
                product="tr",
                premium=Decimal("33500"),
                status="expired",
                start=today - timedelta(days=420),
                end=today - timedelta(days=55),
                vehicle=dict(
                    plate="MNO456",
                    make="Ford",
                    model="Focus",
                    version="Titanium",
                    year=2016,
                    city="Rosario",
                    has_garage=True,
                    is_zero_km=False,
                    usage="privado",
                    has_gnc=False,
                    gnc_amount=None,
                ),
            ),
            dict(
                number="SC-1004",
                user=None,
                product="rc",
                premium=Decimal("14200"),
                status="active",
                start=today - timedelta(days=10),
                end=today + timedelta(days=355),
                vehicle=dict(
                    plate="DEF234",
                    make="Renault",
                    model="Sandero",
                    version="Stepway",
                    year=2022,
                    city="Cordoba",
                    has_garage=False,
                    is_zero_km=False,
                    usage="privado",
                    has_gnc=False,
                    gnc_amount=None,
                ),
            ),
            dict(
                number="SC-1005",
                user=None,
                product="tc",
                premium=Decimal("18900"),
                status="active",
                start=today - timedelta(days=5),
                end=today + timedelta(days=180),
                vehicle=dict(
                    plate="GHI789",
                    make="Chevrolet",
                    model="Onix",
                    version="LT",
                    year=2021,
                    city="Mendoza",
                    has_garage=True,
                    is_zero_km=False,
                    usage="privado",
                    has_gnc=False,
                    gnc_amount=None,
                ),
            ),
        ]

        for item in policies:
            product = product_map.get(item["product"])
            user = user_map.get(item["user"])
            policy_defaults = dict(
                user=user,
                product=product,
                premium=item["premium"],
                status=item["status"],
                start_date=item["start"],
                end_date=item["end"],
            )
            policy, _ = Policy.objects.update_or_create(
                number=item["number"],
                defaults=policy_defaults,
            )
            vehicle_data = item.get("vehicle")
            if vehicle_data:
                PolicyVehicle.objects.update_or_create(
                    policy=policy,
                    defaults=vehicle_data,
                )

    def _reset_data(self, demo_dnis, reset_products):
        """
        Borra datos existentes antes de sembrar de nuevo.
        """
        self.stdout.write("Limpiando datos previos...")
        PolicyVehicle.objects.all().delete()
        Policy.objects.all().delete()
        User.objects.filter(dni__in=demo_dnis).delete()
        if reset_products:
            Product.objects.all().delete()
