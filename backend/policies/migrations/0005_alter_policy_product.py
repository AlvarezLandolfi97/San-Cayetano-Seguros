from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0001_initial"),
        ("policies", "0004_remove_policy_holder_remove_policy_license_plate_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="policy",
            name="product",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="policies",
                to="products.product",
            ),
        ),
    ]
