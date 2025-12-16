from django.db import models
from accounts.models import User
from products.models import Product
from django.utils import timezone


class Policy(models.Model):
    STATUS = [
        ("active", "Activa"),
        ("no_coverage", "Sin cobertura"),
        ("expired", "Vencida"),
        ("suspended", "Suspendida"),
        ("cancelled", "Cancelada"),
        ("inactive", "Inactiva"),
    ]

    number = models.CharField(max_length=30, unique=True)
    user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="policies",
        verbose_name="Titular",
    )
    product = models.ForeignKey(
        Product,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="policies",
    )
    premium = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS, default="active")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    claim_code = models.CharField(max_length=20, null=True, blank=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Póliza"
        verbose_name_plural = "Pólizas"

    def __str__(self):
        plate = getattr(getattr(self, "vehicle", None), "plate", "")
        return f"{self.number} - {plate}".strip(" -")

    @property
    def is_active(self):
        return self.status == "active"


class PolicyVehicle(models.Model):
    policy = models.OneToOneField(Policy, on_delete=models.CASCADE, related_name="vehicle")
    plate = models.CharField("Patente", max_length=10, db_index=True)
    make = models.CharField("Marca", max_length=80)
    model = models.CharField("Modelo", max_length=80)
    version = models.CharField("Versión", max_length=80, blank=True)
    year = models.PositiveIntegerField("Año")
    city = models.CharField("Ciudad", max_length=80, blank=True)
    has_garage = models.BooleanField(default=False)
    is_zero_km = models.BooleanField(default=False)
    usage = models.CharField(max_length=30, default="privado")
    has_gnc = models.BooleanField(default=False)
    gnc_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    class Meta:
        verbose_name = "Vehículo de póliza"
        verbose_name_plural = "Vehículos de póliza"

    def __str__(self):
        return f"{self.plate.upper()} - {self.make} {self.model} ({self.year})"


class PolicyInstallment(models.Model):
    class Status:
        PENDING = "pending"
        NEAR_DUE = "near_due"
        PAID = "paid"
        EXPIRED = "expired"

        CHOICES = [
            (PENDING, "Pendiente"),
            (NEAR_DUE, "Próximo a vencer"),
            (PAID, "Pagado"),
            (EXPIRED, "Vencido"),
        ]

    policy = models.ForeignKey(
        Policy,
        on_delete=models.CASCADE,
        related_name="installments",
    )
    sequence = models.PositiveIntegerField(help_text="Número de cuota dentro de la vigencia (1..N)")
    period_start_date = models.DateField()
    period_end_date = models.DateField(null=True, blank=True)
    payment_window_start = models.DateField()
    payment_window_end = models.DateField()
    due_date_display = models.DateField()
    due_date_real = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=12, choices=Status.CHOICES, default=Status.PENDING)
    paid_at = models.DateTimeField(null=True, blank=True)
    payment = models.ForeignKey(
        "payments.Payment",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="installments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["policy_id", "sequence"]
        unique_together = ["policy", "sequence"]
        verbose_name = "Cuota de póliza"
        verbose_name_plural = "Cuotas de póliza"

    def mark_paid(self, payment=None, when=None):
        self.status = self.Status.PAID
        self.paid_at = when or timezone.now()
        if payment:
            self.payment = payment
        self.save(update_fields=["status", "paid_at", "payment", "updated_at"])
