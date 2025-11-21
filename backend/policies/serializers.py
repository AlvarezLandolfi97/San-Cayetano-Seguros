# backend/policies/serializers.py
from rest_framework import serializers
from .models import Policy
from vehicles.models import Vehicle


class VehicleLiteSerializer(serializers.Serializer):
    """Representación simple del vehículo asociada a una póliza."""
    brand = serializers.CharField()
    model = serializers.CharField()
    plate = serializers.CharField()


class PolicySerializer(serializers.ModelSerializer):
    vehicle = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Policy
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    # 🔹 Muestra un texto más legible para el estado
    def get_status(self, obj):
        mapping = {
            "PEND": "Pendiente de pago",
            "ACT": "Activa",
            "VENC": "Vencida",
            "BAJA": "Dada de baja",
        }
        return mapping.get(obj.state, obj.state)

    # 🔹 Busca el vehículo asociado por patente
    def get_vehicle(self, obj):
        try:
            v = Vehicle.objects.filter(license_plate=obj.license_plate).order_by("-id").first()
            if v:
                return {
                    "brand": v.brand,
                    "model": v.model,
                    "plate": v.license_plate,
                }
        except Exception:
            pass
        # fallback si no encuentra vehículo registrado
        return {"brand": "", "model": "", "plate": obj.license_plate or ""}

    # 🔹 Validación opcional de fechas (mantiene tu lógica)
    def validate(self, data):
        valid_from = data.get("valid_from")
        valid_to = data.get("valid_to")
        if valid_from and valid_to and valid_to < valid_from:
            raise serializers.ValidationError("La fecha de fin no puede ser anterior a la de inicio.")
        return data
