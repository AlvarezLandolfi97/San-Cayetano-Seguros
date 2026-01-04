from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quotes", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="quoteshare",
            name="expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
