from django.db import models


class ContactInfo(models.Model):
    whatsapp = models.CharField("WhatsApp", max_length=50, blank=True, default="+54 9 221 000 0000")
    email = models.EmailField("Email", blank=True, default="hola@sancayetano.com")
    address = models.CharField("Dirección", max_length=255, blank=True, default="Av. Ejemplo 1234, La Plata, Buenos Aires")
    map_embed_url = models.TextField(
        "URL de iframe de mapa",
        blank=True,
        help_text="Pega aquí el iframe src de Google Maps para mostrar la ubicación.",
        default="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.798536911205!2d-58.381592984774424!3d-34.603738980460806!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzTCsDM2JzEzLjQiUyA1OMKwMjInNTUuNyJX!5e0!3m2!1ses!2sar!4v1700000000000",
    )
    schedule = models.CharField("Horario de atención", max_length=120, blank=True, default="Lun a Vie 9:00 a 18:00")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Contacto"
        verbose_name_plural = "Contacto"

    def __str__(self):
        return "Información de contacto"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(id=1)
        return obj
