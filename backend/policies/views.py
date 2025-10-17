from rest_framework import viewsets, permissions
from .models import Policy
from .serializers import PolicySerializer


class PolicyViewSet(viewsets.ModelViewSet):
    """
    API endpoint para gestionar pólizas (seguros).
    - Los administradores pueden crear, editar, eliminar y listar todas.
    - Los clientes autenticados solo pueden ver sus propias pólizas.
    """
    serializer_class = PolicySerializer

    def get_queryset(self):
        user = self.request.user
        qs = (
            Policy.objects
            .select_related("holder", "product")  # mejora rendimiento
            .order_by("-id")
        )

        # Clientes solo ven las suyas
        if user.is_authenticated and not user.is_staff:
            qs = qs.filter(holder=user)

        # Filtro opcional: /api/policies/?state=ACT
        state = self.request.query_params.get("state")
        if state:
            qs = qs.filter(state=state.upper())

        return qs

    def get_permissions(self):
        """
        - Admin: puede crear, modificar, eliminar y listar.
        - Cliente autenticado: solo puede ver (retrieve / list sus pólizas).
        """
        if self.action in ["create", "update", "partial_update", "destroy", "list"]:
            permission_classes = [permissions.IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [perm() for perm in permission_classes]
