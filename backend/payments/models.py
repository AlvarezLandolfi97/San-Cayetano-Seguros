from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone
from policies.models import Policy, PolicyInstallment

from payments.utils import period_from_installment

PERIOD_REGEX = r"^(19|20)\d{2}(0[1-9]|1[0-2])$"
period_validator = RegexValidator(
    regex=PERIOD_REGEX,
    message="El período debe tener el formato AAAAMM y representar un mes válido.",
)


class Payment(models.Model):
    STATE = (("PEN","Pendiente"), ("APR","Aprobado"), ("REJ","Rechazado"))

    policy = models.ForeignKey(Policy, on_delete=models.CASCADE, related_name="payments")
    period = models.CharField(
        max_length=6,
        db_index=True,
        validators=[period_validator],
        help_text="Período AAAAMM (mes entre 01 y 12).",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    installment = models.OneToOneField(
        "policies.PolicyInstallment",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="payment",
    )
    state = models.CharField(max_length=3, choices=STATE, default="PEN")
    mp_preference_id = models.CharField(max_length=80, blank=True)
    mp_payment_id = models.CharField(max_length=80, blank=True)
    receipt_pdf = models.FileField(upload_to="receipts/", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_state_change_at = models.DateTimeField(null=True, blank=True)
    last_state_change_reason = models.CharField(max_length=128, null=True, blank=True)

    def _sync_from_installment(self):
        instal = getattr(self, "installment", None)
        if not instal:
            return False
        expected_period = period_from_installment(instal)
        expected_amount = instal.amount
        changed = False
        if expected_period and self.period != expected_period:
            self.period = expected_period
            changed = True
        if expected_amount is not None and self.amount != expected_amount:
            self.amount = expected_amount
            changed = True
        return changed

    def clean(self):
        """
        Enforce that linked installments share the same policy, and derive the
        policy from the installment to keep the relationship tight.
        """
        super().clean()
        if not self.installment_id:
            return
        try:
            installment = self.installment
        except PolicyInstallment.DoesNotExist:
            return
        derived_policy_id = installment.policy_id
        if self.policy_id and self.policy_id != derived_policy_id:
            raise ValidationError(
                {
                    "policy": "Debe coincidir con la póliza del vencimiento asociado al pago."
                }
            )
        self.policy = installment.policy

    def save(self, *args, **kwargs):
        # Keep the payment's metadata aligned with the installment whenever it's linked.
        self._sync_from_installment()
        self.full_clean(validate_unique=False)

        state_changed = False
        if self.pk:
            prev_state = (
                self.__class__.objects.filter(pk=self.pk)
                .values_list("state", flat=True)
                .first()
            )
            if prev_state != self.state:
                state_changed = True
        else:
            state_changed = True
        if state_changed:
            self.last_state_change_at = timezone.now()

        self._sync_from_installment()

        save_kwargs = dict(kwargs)
        update_fields = save_kwargs.get("update_fields")
        if state_changed and update_fields is not None:
            fields = set(update_fields)
            fields.add("last_state_change_at")
            save_kwargs["update_fields"] = fields

        super().save(*args, **save_kwargs)

    class Meta:
        # The equality between policy and installment.policy can only be guaranteed
        # at the application layer via Payment.clean.
        pass



class Receipt(models.Model):
    policy = models.ForeignKey(Policy, on_delete=models.CASCADE, related_name="receipts")
    date = models.DateField(auto_now_add=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    concept = models.CharField(max_length=120, blank=True)
    method = models.CharField(max_length=30, blank=True)
    auth_code = models.CharField(max_length=80, blank=True)
    next_due = models.DateField(null=True, blank=True)
    # Legacy receipt fields preserve historical Charge data now that the Charge model has been removed.
    legacy_charge_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Legacy Charge PK preserved for audit after Charge removal. Charge no longer exists in runtime.",
    )
    legacy_charge_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Legacy Charge amount (if available) for historic receipts. Used for post-mortem reporting only.",
    )
    legacy_charge_due_date = models.DateField(
        null=True,
        blank=True,
        help_text="Legacy Charge due date (if available) for historic receipts. Not part of the billing flow.",
    )
    file = models.FileField(upload_to="receipts/", null=True, blank=True)

    class Meta:
        ordering = ["-date", "-id"]
        verbose_name = "Recibo"
        verbose_name_plural = "Recibos"

    def __str__(self):
        return f"Recibo {self.id} - {self.policy.number}"


class PaymentWebhookEvent(models.Model):
    PROVIDER_MERCADO_PAGO = "mercadopago"

    PROVIDER_CHOICES = [
        (PROVIDER_MERCADO_PAGO, "Mercado Pago"),
    ]

    provider = models.CharField(max_length=40, choices=PROVIDER_CHOICES)
    external_event_id = models.CharField(max_length=255)
    payment = models.ForeignKey(
        Payment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="webhook_events",
    )
    received_at = models.DateTimeField(auto_now_add=True)
    raw_payload = models.JSONField(null=True, blank=True)

    class Meta:
        unique_together = [["provider", "external_event_id"]]
        ordering = ["-received_at"]
