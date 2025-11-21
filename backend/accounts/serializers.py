from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id','dni','first_name','last_name','email','phone','birth_date','is_staff')
