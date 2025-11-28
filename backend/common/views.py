from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ContactInfo
from .serializers import ContactInfoSerializer


class ContactInfoView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_permissions(self):
        # Lectura pública, escritura solo admins
        if self.request.method.lower() in ("patch", "put", "post", "delete"):
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def get(self, request):
        obj = ContactInfo.get_solo()
        data = ContactInfoSerializer(obj).data
        return Response(data)

    def patch(self, request):
        obj = ContactInfo.get_solo()
        serializer = ContactInfoSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    put = patch
