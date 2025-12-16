from django.contrib import admin
from .models import Payment, Charge, Receipt

admin.site.register(Payment)
admin.site.register(Charge)
admin.site.register(Receipt)
