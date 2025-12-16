from rest_framework import serializers
from .models import Payment, Charge, Receipt

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'


class ChargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Charge
        fields = ["id", "concept", "amount", "due_date", "status"]


class ReceiptSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Receipt
        fields = ["id", "date", "amount", "concept", "method", "auth_code", "next_due", "file_url"]

    def get_file_url(self, obj):
        req = self.context.get("request")
        if obj.file and hasattr(obj.file, "url"):
            if req:
                return req.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
