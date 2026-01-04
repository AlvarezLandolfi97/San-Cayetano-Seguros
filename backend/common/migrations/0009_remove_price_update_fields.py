from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0008_appsettings_policy_adjustment_window_days"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="appsettings",
            name="price_update_offset_days",
        ),
        migrations.RemoveField(
            model_name="appsettings",
            name="price_update_every_months",
        ),
    ]
