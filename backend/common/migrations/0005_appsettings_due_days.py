from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0004_announcement"),
    ]

    operations = [
        migrations.AddField(
            model_name="appsettings",
            name="payment_due_day_display",
            field=models.PositiveIntegerField(
                default=5,
                help_text="Día del mes comunicado al cliente como vencimiento (1-28/31).",
            ),
        ),
        migrations.AddField(
            model_name="appsettings",
            name="payment_due_day_real",
            field=models.PositiveIntegerField(
                default=7,
                help_text="Día del mes como corte real; debe ser >= display.",
            ),
        ),
    ]
