from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ContactInfo
from .serializers import ContactInfoSerializer


class ContactInfoView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        obj = ContactInfo.get_solo()
        data = ContactInfoSerializer(obj).data
        return Response(data)
