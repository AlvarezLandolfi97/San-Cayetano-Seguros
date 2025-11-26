from rest_framework import viewsets, permissions
from .models import Vehicle
from .serializers import VehicleSerializer


class VehicleViewSet(viewsets.ModelViewSet):
    """
    API endpoint para gestionar vehículos.
    - Los administradores pueden crear, editar y eliminar.
    - Los clientes autenticados solo pueden ver sus propios vehículos.
    """
    serializer_class = VehicleSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Vehicle.objects.select_related("owner").order_by("-id")
        # Clientes: solo sus vehículos
        if user.is_authenticated and not user.is_staff:
            qs = qs.filter(owner=user)
        return qs

    def get_permissions(self):
        """
        Define permisos según la acción:
        - Admin: create/update/delete
        - Autenticados: list/retrieve de sus vehículos
        """
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAdminUser()]
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        # Fallback: acceso autenticado
        return [permissions.IsAuthenticated()]
