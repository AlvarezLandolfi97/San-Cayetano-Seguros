from django.db import models

class Product(models.Model):
    VEHICLE_TYPES = (('AUTO','Auto'), ('MOTO','Moto'), ('COM','Comercial'))
    PLAN_TYPES = (('RC','Responsabilidad Civil'), ('TC','Terceros Completo'), ('TR','Todo Riesgo'))

    name = models.CharField(max_length=80)
    vehicle_type = models.CharField(max_length=5, choices=VEHICLE_TYPES)
    plan_type = models.CharField(max_length=2, choices=PLAN_TYPES)
    min_year = models.PositiveIntegerField(default=1995)
    max_year = models.PositiveIntegerField(default=2100)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    franchise = models.CharField(max_length=80, blank=True)
    coverages = models.TextField(help_text='Lista de coberturas en markdown')
    published_home = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.get_plan_type_display()})"
