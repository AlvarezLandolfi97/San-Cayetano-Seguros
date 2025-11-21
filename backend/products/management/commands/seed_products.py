from django.core.management.base import BaseCommand
from products.models import Product

class Command(BaseCommand):
    help = 'Seed vehicular products'

    def handle(self, *args, **kwargs):
        data = [
            dict(name='Auto RC Básico', vehicle_type='AUTO', plan_type='RC', min_year=1995, max_year=2035, base_price=12000, franchise='-', coverages='- RC hasta X\n- Defensa civil'),
            dict(name='Auto Terceros Completo', vehicle_type='AUTO', plan_type='TC', min_year=2005, max_year=2035, base_price=22000, franchise='$50.000', coverages='- RC\n- Cristales\n- Granizo'),
            dict(name='Auto Todo Riesgo', vehicle_type='AUTO', plan_type='TR', min_year=2015, max_year=2035, base_price=42000, franchise='$200.000', coverages='- Daños totales y parciales'),
        ]
        for d in data:
            Product.objects.update_or_create(name=d['name'], defaults=d)
        self.stdout.write(self.style.SUCCESS('Products seeded'))
