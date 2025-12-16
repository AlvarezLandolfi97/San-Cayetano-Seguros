from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0005_appsettings_payment_windows'),
    ]

    operations = [
        migrations.AddField(
            model_name='appsettings',
            name='price_update_every_months',
            field=models.PositiveIntegerField(default=3),
        ),
    ]

