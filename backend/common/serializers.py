from rest_framework import serializers
from .models import ContactInfo, AppSettings, Announcement


class ContactInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInfo
        fields = ("whatsapp", "email", "address", "map_embed_url", "schedule", "updated_at")


class AppSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSettings
        fields = (
            "expiring_threshold_days",
            "client_expiration_offset_days",
            "default_term_months",
            "payment_window_days",
            "payment_due_day_display",
            "payment_due_day_real",
            "policy_adjustment_window_days",
            "updated_at",
        )


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ("id", "title", "message", "link", "is_active", "order", "created_at", "updated_at")
