from rest_framework import serializers
from .models import Policy


class PolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = Policy
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    # Validación opcional de fechas
    def validate(self, data):
        valid_from = data.get('valid_from')
        valid_to = data.get('valid_to')
        if valid_from and valid_to and valid_to < valid_from:
            raise serializers.ValidationError("La fecha de fin no puede ser anterior a la de inicio.")
        return data
