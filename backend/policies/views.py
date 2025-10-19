# backend/policies/views.py
from rest_framework import viewsets, permissions
from .models import Policy
from .serializers import PolicySerializer


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permite acceso si es admin o si la póliza pertenece al usuario autenticado.
    Se aplica a acciones con objeto (retrieve, update, destroy, etc.).
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(user.is_staff or obj.holder_id == user.id)


class PolicyViewSet(viewsets.ModelViewSet):
    """
    API endpoint para gestionar pólizas (seguros).
    - Admin: CRUD completo y listado global.
    - Cliente:
        * list -> solo si usa ?mine=1 (sus pólizas)
        * retrieve -> solo si es dueño de la póliza
    """
    serializer_class = PolicySerializer

    def get_queryset(self):
        req = self.request
        user = req.user
        qs = (
            Policy.objects
            .select_related("holder", "product")  # mejora rendimiento
            .order_by("-id")
        )

        # Filtro opcional por estado: /api/policies/?state=ACT
        state = (req.query_params.get("state") or "").upper().strip()
        if state:
            qs = qs.filter(state=state)

        # Soporte para /api/policies/?mine=1
        mine = req.query_params.get("mine") in ("1", "true", "yes")
        if mine and user.is_authenticated:
            qs = qs.filter(holder=user)
            return qs

        # Sin 'mine': solo admin puede ver el listado global
        if user.is_staff:
            return qs

        # Usuario no admin sin 'mine' -> queryset vacío (protegemos datos)
        return qs.none()

    def get_permissions(self):
        """
        - list: admin o autenticado con ?mine=1
        - retrieve: autenticado + dueño/admin (obj-level)
        - create/update/partial_update/destroy: admin
        """
        action = self.action

        if action == "list":
            # Permitir list si es admin o si pidió mine=1 estando autenticado
            user = getattr(self.request, "user", None)
            mine = self.request.query_params.get("mine") in ("1", "true", "yes")
            if user and user.is_authenticated and mine:
                return [permissions.IsAuthenticated()]
            return [permissions.IsAdminUser()]

        if action in ["retrieve"]:
            # Autenticado + chequeo a nivel objeto con IsOwnerOrAdmin
            return [permissions.IsAuthenticated(), IsOwnerOrAdmin()]

        if action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAdminUser()]

        # Fallback conservador
        return [permissions.IsAdminUser()]
