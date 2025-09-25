from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    username = None
    dni = models.CharField(max_length=20, unique=True)
    phone = models.CharField(max_length=30, blank=True)
    birth_date = models.DateField(null=True, blank=True)

    USERNAME_FIELD = 'dni'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.dni
