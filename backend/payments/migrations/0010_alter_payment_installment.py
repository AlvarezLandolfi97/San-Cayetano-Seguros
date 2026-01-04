from django.db import migrations, models

from payments.utils import normalize_duplicate_installment_payments


def dedupe_installment_payments(apps, schema_editor):
    Payment = apps.get_model("payments", "Payment")
    duplicates = {}
    for payment in Payment.objects.exclude(installment_id__isnull=True):
        duplicates.setdefault(payment.installment_id, []).append(payment)
    for payments in duplicates.values():
        if len(payments) <= 1:
            continue
        normalize_duplicate_installment_payments(payments)


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0009_paymentwebhookevent"),
        ("policies", "0008_remove_policyinstallment_payment"),
    ]

    operations = [
        migrations.RunPython(
            dedupe_installment_payments,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveConstraint(
            model_name="payment",
            name="uniq_payment_installment",
        ),
        migrations.AlterField(
            model_name="payment",
            name="installment",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=models.PROTECT,
                related_name="payment",
                to="policies.policyinstallment",
            ),
        ),
    ]
