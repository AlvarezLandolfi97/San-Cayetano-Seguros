from django.db import models
from policies.models import Policy

class Payment(models.Model):
    STATE = (('PEN','Pendiente'), ('APR','Aprobado'), ('REJ','Rechazado'))

    policy = models.ForeignKey(Policy, on_delete=models.CASCADE, related_name='payments')
    period = models.CharField(max_length=6)  # AAAAMM
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    state = models.CharField(max_length=3, choices=STATE, default='PEN')
    mp_preference_id = models.CharField(max_length=80, blank=True)
    mp_payment_id = models.CharField(max_length=80, blank=True)
    receipt_pdf = models.FileField(upload_to='receipts/', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Charge(models.Model):
    STATUS = (("pending", "Pendiente"), ("paid", "Pagado"), ("failed", "Falló"))

    policy = models.ForeignKey(Policy, on_delete=models.CASCADE, related_name="charges")
    concept = models.CharField(max_length=120)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Cargo pendiente"
        verbose_name_plural = "Cargos pendientes"

    def __str__(self):
        return f"{self.policy.number} - {self.concept}"


class Receipt(models.Model):
    policy = models.ForeignKey(Policy, on_delete=models.CASCADE, related_name="receipts")
    charge = models.ForeignKey(Charge, null=True, blank=True, on_delete=models.SET_NULL, related_name="receipts")
    date = models.DateField(auto_now_add=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    concept = models.CharField(max_length=120, blank=True)
    method = models.CharField(max_length=30, blank=True)
    auth_code = models.CharField(max_length=80, blank=True)
    next_due = models.DateField(null=True, blank=True)
    file = models.FileField(upload_to="receipts/", null=True, blank=True)

    class Meta:
        ordering = ["-date", "-id"]
        verbose_name = "Recibo"
        verbose_name_plural = "Recibos"

    def __str__(self):
        return f"Recibo {self.id} - {self.policy.number}"
