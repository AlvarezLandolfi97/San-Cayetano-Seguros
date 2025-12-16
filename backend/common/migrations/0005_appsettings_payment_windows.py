from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0004_announcement'),
    ]

    operations = [
        migrations.AddField(
            model_name='appsettings',
            name='payment_window_days',
            field=models.PositiveIntegerField(default=5),
        ),
        migrations.AddField(
            model_name='appsettings',
            name='price_update_offset_days',
            field=models.PositiveIntegerField(default=2),
        ),
    ]

