from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0007_merge_20241212_0000"),
    ]

    operations = [
        migrations.AddField(
            model_name="appsettings",
            name="policy_adjustment_window_days",
            field=models.PositiveIntegerField(
                default=7,
                help_text="Cantidad de días antes del fin de la póliza en los que se considera el periodo de ajuste.",
            ),
        ),
    ]
