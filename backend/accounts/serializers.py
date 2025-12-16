from rest_framework import serializers
from django.db import transaction
from .models import User
from policies.models import Policy


class UserSerializer(serializers.ModelSerializer):
    policy_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = User
        fields = ('id','dni','first_name','last_name','email','phone','birth_date','is_staff','is_active','policy_ids')
        extra_kwargs = {
            "is_staff": {"read_only": True},
        }

    @transaction.atomic
    def update(self, instance, validated_data):
        policy_ids = validated_data.pop("policy_ids", None)
        instance = super().update(instance, validated_data)

        if policy_ids is not None:
            ids = [int(pk) for pk in policy_ids if isinstance(pk, (int, str)) and str(pk).isdigit()]
            # Desasociar pólizas que ya no estén
            Policy.objects.filter(user=instance).exclude(id__in=ids).update(user=None)
            # Asociar nuevas
            if ids:
                Policy.objects.filter(id__in=ids).update(user=instance)

        return instance

    @transaction.atomic
    def create(self, validated_data):
        policy_ids = validated_data.pop("policy_ids", [])
        user = super().create(validated_data)
        if policy_ids:
            ids = [int(pk) for pk in policy_ids if isinstance(pk, (int, str)) and str(pk).isdigit()]
            if ids:
                Policy.objects.filter(id__in=ids).update(user=user)
        return user
