from django.db import models
from accounts.models import User
from products.models import Product

class Policy(models.Model):
    STATE = (('PEND','Pendiente de pago'), ('ACT','Activa'), ('VENC','Vencida'), ('BAJA','Baja'))

    number = models.CharField(max_length=30, unique=True)
    holder = models.ForeignKey(User, on_delete=models.CASCADE, related_name='policies')
    license_plate = models.CharField(max_length=10)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    state = models.CharField(max_length=4, choices=STATE, default='PEND')
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    pdf = models.FileField(upload_to='policies/', blank=True)

    def __str__(self):
        return f"{self.number} - {self.license_plate}"
