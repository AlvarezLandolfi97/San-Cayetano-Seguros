from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("vehicles", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="vehicle",
            name="color",
            field=models.CharField(blank=True, max_length=30, null=True, verbose_name="Color"),
        ),
        migrations.AddField(
            model_name="vehicle",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="vehicle",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AlterModelOptions(
            name="vehicle",
            options={
                "ordering": ["license_plate"],
                "verbose_name": "Vehículo",
                "verbose_name_plural": "Vehículos",
            },
        ),
    ]
