from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ContactInfo, AppSettings, Announcement
from .serializers import ContactInfoSerializer, AppSettingsSerializer, AnnouncementSerializer


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


class AppSettingsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        obj = AppSettings.get_solo()
        return Response(AppSettingsSerializer(obj).data)

    def patch(self, request):
        obj = AppSettings.get_solo()
        serializer = AppSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    put = patch


class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    CRUD admin + listado público de anuncios.
    """
    queryset = Announcement.objects.all().order_by("order", "-created_at")
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        # Solo lectura pública; resto admins
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ["list", "retrieve"]:
            qs = qs.filter(is_active=True)
        return qs
