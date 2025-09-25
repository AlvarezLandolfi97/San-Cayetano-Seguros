from django.db import models
from accounts.models import User

class Vehicle(models.Model):
    TYPE_CHOICES = (('AUTO','Auto'), ('MOTO','Moto'), ('COM','Comercial/Liviano'))
    license_plate = models.CharField(max_length=10)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vehicles')
    vtype = models.CharField(max_length=4, choices=TYPE_CHOICES)
    brand = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.PositiveIntegerField()
    use = models.CharField(max_length=30, default='Particular')
    fuel = models.CharField(max_length=20, blank=True)

    class Meta:
        unique_together = ('owner','license_plate')

    def __str__(self):
        return f"{self.license_plate} - {self.brand} {self.model}"
