from django import forms
from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import reverse

from .models import ContactInfo, AppSettings, Announcement


@admin.register(ContactInfo)
class ContactInfoAdmin(admin.ModelAdmin):
    list_display = ("whatsapp", "email", "address", "schedule", "updated_at")

    def has_add_permission(self, request):
        # Limit to single instance
        return not ContactInfo.objects.exists()

    def add_view(self, request, form_url="", extra_context=None):
        if ContactInfo.objects.exists():
            obj = ContactInfo.get_solo()
            url = reverse("admin:common_contactinfo_change", args=(obj.pk,))
            return HttpResponseRedirect(url)
        return super().add_view(request, form_url, extra_context)


class AppSettingsForm(forms.ModelForm):
    class Meta:
        model = AppSettings
        fields = [
            "payment_window_days",
            "payment_due_day_display",
            "default_term_months",
            "policy_adjustment_window_days",
        ]
        labels = {
            "payment_window_days": "Duración de la ventana de pago (días)",
            "payment_due_day_display": "Vencimiento visible para el cliente (día dentro del período)",
            "default_term_months": "Duración del plan (meses)",
            "policy_adjustment_window_days": "Período de ajuste antes del fin (días)",
        }
        help_texts = {
            "payment_window_days": "Cantidad de días que dura la ventana de pago desde el inicio del período mensual (y).",
            "payment_due_day_display": "Día dentro de la ventana de pago que se muestra al cliente (1..y). No modifica el vencimiento real.",
            "default_term_months": "Cantidad de meses/cuotas que se generan por defecto cuando la póliza no tiene end_date (x).",
            "policy_adjustment_window_days": "Cantidad de días previos al fin de la póliza que definen la ventana de ajuste (w).",
        }


@admin.register(AppSettings)
class AppSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "payment_window_days",
        "payment_due_day_display",
        "default_term_months",
        "policy_adjustment_window_days",
        "updated_at",
    )
    readonly_fields = ("updated_at",)
    form = AppSettingsForm
    fieldsets = (
        ("Calendario de cobro", {
            "fields": (
                "payment_window_days",
                "payment_due_day_display",
                "default_term_months",
                "policy_adjustment_window_days",
            ),
        }),
        ("Auditoría", {
            "fields": ("updated_at",),
        }),
    )

    def has_add_permission(self, request):
        return not AppSettings.objects.exists()

    def add_view(self, request, form_url="", extra_context=None):
        if AppSettings.objects.exists():
            obj = AppSettings.get_solo()
            url = reverse("admin:common_appsettings_change", args=(obj.pk,))
            return HttpResponseRedirect(url)
        return super().add_view(request, form_url, extra_context)


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "is_active", "order", "created_at", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("title", "message")
