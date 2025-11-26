from rest_framework import serializers
from .models import ContactInfo


class ContactInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInfo
        fields = ("whatsapp", "email", "address", "map_embed_url", "schedule", "updated_at")
