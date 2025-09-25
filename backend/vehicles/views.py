from rest_framework import viewsets, permissions
from .models import Vehicle
from .serializers import VehicleSerializer

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().order_by('-id')
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAdminUser]
