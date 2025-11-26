from django.contrib import admin
from .models import ContactInfo


@admin.register(ContactInfo)
class ContactInfoAdmin(admin.ModelAdmin):
    list_display = ("whatsapp", "email", "address", "schedule", "updated_at")

    def has_add_permission(self, request):
        # Limit to single instance
        return not ContactInfo.objects.exists()
