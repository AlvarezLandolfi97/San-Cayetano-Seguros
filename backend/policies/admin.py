from django.contrib import admin
from .models import Policy, PolicyVehicle, PolicyInstallment

@admin.register(Policy)
class PolicyAdmin(admin.ModelAdmin):
    list_display = ("number", "user", "status", "start_date", "end_date")
    search_fields = ("number", "user__email")
    list_filter = ("status",)

admin.site.register(PolicyVehicle)
admin.site.register(PolicyInstallment)
