from django.contrib import admin
from .models import ContactInfo, AppSettings, Announcement


@admin.register(ContactInfo)
class ContactInfoAdmin(admin.ModelAdmin):
    list_display = ("whatsapp", "email", "address", "schedule", "updated_at")

    def has_add_permission(self, request):
        # Limit to single instance
        return not ContactInfo.objects.exists()


@admin.register(AppSettings)
class AppSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "expiring_threshold_days",
        "client_expiration_offset_days",
        "payment_window_days",
        "price_update_offset_days",
        "price_update_every_months",
        "default_term_months",
        "updated_at",
    )

    def has_add_permission(self, request):
        return not AppSettings.objects.exists()


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "is_active", "order", "created_at", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("title", "message")
