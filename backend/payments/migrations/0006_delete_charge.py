from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0005_remove_receipt_charge"),
    ]

    operations = [
        migrations.DeleteModel(
            name="Charge",
        ),
    ]
