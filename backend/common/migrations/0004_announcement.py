from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0003_appsettings"),
    ]

    operations = [
        migrations.CreateModel(
            name="Announcement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=120)),
                ("message", models.TextField(blank=True, default="")),
                ("link", models.URLField(blank=True, default="")),
                ("is_active", models.BooleanField(default=True)),
                ("order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Anuncio",
                "verbose_name_plural": "Anuncios",
                "ordering": ["order", "-created_at"],
            },
        ),
    ]
