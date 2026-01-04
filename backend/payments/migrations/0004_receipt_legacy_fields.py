from datetime import date

from django.db import migrations, models


def backfill_legacy_charge_fields(apps, schema_editor):
    Receipt = apps.get_model("payments", "Receipt")
    receipts = Receipt.objects.filter(charge_id__isnull=False).select_related("charge")
    for receipt in receipts:
        if receipt.legacy_charge_id:
            continue
        receipt.legacy_charge_id = receipt.charge_id
        charge = getattr(receipt, "charge", None)
        if charge is not None:
            receipt.legacy_charge_amount = charge.amount
            receipt.legacy_charge_due_date = charge.due_date
        receipt.save(update_fields=["legacy_charge_id", "legacy_charge_amount", "legacy_charge_due_date"])


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0003_payment_installment"),
    ]

    operations = [
        migrations.AddField(
            model_name="receipt",
            name="legacy_charge_id",
            field=models.IntegerField(blank=True, help_text="Legacy Charge PK preserved for audit after Charge removal.", null=True),
        ),
        migrations.AddField(
            model_name="receipt",
            name="legacy_charge_amount",
            field=models.DecimalField(blank=True, decimal_places=2, help_text="Legacy Charge amount (if available) for historic receipts.", max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name="receipt",
            name="legacy_charge_due_date",
            field=models.DateField(blank=True, help_text="Legacy Charge due date (if available) for historic receipts.", null=True),
        ),
        migrations.RunPython(backfill_legacy_charge_fields, migrations.RunPython.noop),
    ]
