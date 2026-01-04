from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0004_receipt_legacy_fields"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="receipt",
            name="charge",
        ),
    ]
