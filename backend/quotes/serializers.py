from rest_framework import serializers

class QuoteInputSerializer(serializers.Serializer):
    vtype = serializers.ChoiceField(choices=['AUTO','MOTO','COM'])
    year = serializers.IntegerField(min_value=1970, max_value=2100)
    brand = serializers.CharField(required=False, allow_blank=True)
    model = serializers.CharField(required=False, allow_blank=True)
    use = serializers.CharField(required=False, allow_blank=True)
