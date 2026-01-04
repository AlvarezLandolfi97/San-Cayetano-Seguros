from django.db import models
from django.db.models import F
from django.db.models.functions import Lower
from accounts.models import User


class Vehicle(models.Model):
    TYPE_CHOICES = [
        ('AUTO', 'Auto'),
        ('MOTO', 'Moto'),
        ('COM', 'Comercial/Liviano'),
    ]

    license_plate = models.CharField("Patente", max_length=10, db_index=True)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="vehicles",
        verbose_name="Titular"
    )
    vtype = models.CharField("Tipo", max_length=4, choices=TYPE_CHOICES)
    brand = models.CharField("Marca", max_length=50)
    model = models.CharField("Modelo", max_length=50)
    year = models.PositiveIntegerField("Año")
    use = models.CharField("Uso", max_length=30, default="Particular")
    fuel = models.CharField("Combustible", max_length=20, blank=True)
    color = models.CharField("Color", max_length=30, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("license_plate"),
                F("owner"),
                name="uniq_vehicle_owner_plate_ci",
            )
        ]
        ordering = ["license_plate"]
        verbose_name = "Vehículo"
        verbose_name_plural = "Vehículos"

    def __str__(self):
        return f"{self.license_plate.upper()} - {self.brand} {self.model} ({self.year})"

    def save(self, *args, **kwargs):
        """Asegura que la patente se guarde en mayúsculas y sin espacios."""
        if self.license_plate:
            self.license_plate = self.license_plate.strip().upper()
        super().save(*args, **kwargs)
