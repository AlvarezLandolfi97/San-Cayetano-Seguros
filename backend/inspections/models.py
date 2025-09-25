from django.db import models
from accounts.models import User
from products.models import Product

class Inspection(models.Model):
    STATE = (('PEN','Pendiente'), ('APR','Aprobada'), ('REJ','Rechazada'))

    applicant = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='inspections')

    dni = models.CharField(max_length=20)
    email = models.EmailField()
    phone = models.CharField(max_length=30)
    birth_date = models.DateField()

    license_plate = models.CharField(max_length=10)
    vtype = models.CharField(max_length=5, default='AUTO')
    brand = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.PositiveIntegerField()

    selected_product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.SET_NULL)

    front = models.ImageField(upload_to='inspections/')
    back = models.ImageField(upload_to='inspections/')
    left = models.ImageField(upload_to='inspections/')
    right = models.ImageField(upload_to='inspections/')

    state = models.CharField(max_length=3, choices=STATE, default='PEN')
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.license_plate} ({self.dni}) - {self.state}"
