from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0008_alter_payment_installment_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="PaymentWebhookEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("provider", models.CharField(choices=[("mercadopago", "Mercado Pago")], max_length=40)),
                ("external_event_id", models.CharField(max_length=255)),
                ("received_at", models.DateTimeField(auto_now_add=True)),
                ("raw_payload", models.JSONField(blank=True, null=True)),
                (
                    "payment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.SET_NULL,
                        related_name="webhook_events",
                        to="payments.payment",
                    ),
                ),
            ],
            options={
                "ordering": ["-received_at"],
                "unique_together": {("provider", "external_event_id")},
            },
        ),
    ]
