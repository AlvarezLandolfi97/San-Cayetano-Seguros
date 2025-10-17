from rest_framework import serializers
from .models import Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def validate_license_plate(self, value):
        """
        Normaliza y valida la patente.
        - Convierte a mayúsculas
        - Verifica formato argentino (AA123BB o ABC123)
        """
        value = value.strip().upper()

        import re
        # Patrones argentinos modernos y antiguos
        patrones = [
            r"^[A-Z]{2}\d{3}[A-Z]{2}$",  # AA123BB (nuevo)
            r"^[A-Z]{3}\d{3}$",          # ABC123 (viejo)
        ]

        if not any(re.match(p, value) for p in patrones):
            raise serializers.ValidationError(
                "La patente no tiene un formato válido (ejemplo: AB123CD o ABC123)."
            )

        return value
