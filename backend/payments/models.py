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
