import secrets
import string
from django.db import models


def _generate_token(length=10):
    """
    Genera un identificador corto (solo letras/números) para compartir la ficha.
    Intenta evitar colisiones generando un token nuevo si ya existe.
    """
    alphabet = string.ascii_lowercase + string.digits
    while True:
        token = "".join(secrets.choice(alphabet) for _ in range(length))
        if not QuoteShare.objects.filter(token=token).exists():
            return token


def quote_photo_upload_to(instance, filename):
    return f"quote-photos/{instance.token}/{filename}"


class QuoteShare(models.Model):
    token = models.CharField(max_length=12, unique=True, editable=False)

    plan_code = models.CharField(max_length=50, blank=True, default="")
    plan_name = models.CharField(max_length=120, blank=True, default="")

    phone = models.CharField(max_length=32)
    make = models.CharField(max_length=120)
    model = models.CharField(max_length=120)
    version = models.CharField(max_length=120)
    year = models.PositiveIntegerField()
    city = models.CharField(max_length=120)
    has_garage = models.BooleanField()
    is_zero_km = models.BooleanField()
    usage = models.CharField(max_length=30)
    has_gnc = models.BooleanField()
    gnc_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    photo_front = models.ImageField(upload_to=quote_photo_upload_to)
    photo_back = models.ImageField(upload_to=quote_photo_upload_to)
    photo_right = models.ImageField(upload_to=quote_photo_upload_to)
    photo_left = models.ImageField(upload_to=quote_photo_upload_to)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Ficha de cotización"
        verbose_name_plural = "Fichas de cotización"

    def __str__(self):
        return f"Ficha {self.token} - {self.make} {self.model} ({self.year})"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = _generate_token()
        super().save(*args, **kwargs)
