from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="ContactInfo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("whatsapp", models.CharField(default="+54 9 221 000 0000", max_length=50, verbose_name="WhatsApp")),
                ("email", models.EmailField(blank=True, default="hola@sancayetano.com", max_length=254, verbose_name="Email")),
                ("address", models.CharField(blank=True, default="Av. Ejemplo 1234, La Plata, Buenos Aires", max_length=255, verbose_name="Dirección")),
                ("map_embed_url", models.TextField(blank=True, default="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.798536911205!2d-58.381592984774424!3d-34.603738980460806!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzTCsDM2JzEzLjQiUyA1OMKwMjInNTUuNyJX!5e0!3m2!1ses!2sar!4v1700000000000", help_text="Pega aquí el iframe src de Google Maps para mostrar la ubicación.", verbose_name="URL de iframe de mapa")),
                ("schedule", models.CharField(blank=True, default="Lun a Vie 9:00 a 18:00", max_length=120, verbose_name="Horario de atención")),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Contacto",
                "verbose_name_plural": "Contacto",
            },
        ),
    ]
