from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("policies", "0005_alter_policy_product"),
        ("payments", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="PolicyInstallment",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sequence", models.PositiveIntegerField(help_text="Número de cuota dentro de la vigencia (1..N)")),
                ("period_start_date", models.DateField()),
                ("period_end_date", models.DateField(blank=True, null=True)),
                ("payment_window_start", models.DateField()),
                ("payment_window_end", models.DateField()),
                ("due_date_display", models.DateField()),
                ("due_date_real", models.DateField()),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pendiente"),
                            ("near_due", "Próximo a vencer"),
                            ("paid", "Pagado"),
                            ("expired", "Vencido"),
                        ],
                        default="pending",
                        max_length=12,
                    ),
                ),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "payment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="installments",
                        to="payments.payment",
                    ),
                ),
                (
                    "policy",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="installments",
                        to="policies.policy",
                    ),
                ),
            ],
            options={
                "verbose_name": "Cuota de póliza",
                "verbose_name_plural": "Cuotas de póliza",
                "ordering": ["policy_id", "sequence"],
                "unique_together": {("policy", "sequence")},
            },
        ),
    ]
