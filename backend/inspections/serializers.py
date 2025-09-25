from rest_framework import serializers
from .models import Inspection

class InspectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inspection
        fields = '__all__'
        read_only_fields = ('state','admin_notes','applicant','created_at','updated_at')
