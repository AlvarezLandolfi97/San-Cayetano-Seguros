# backend/accounts/views.py
from rest_framework import viewsets, permissions, decorators, response, status
from .models import User
from .serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserSerializer
    pagination_class = None  # el admin recibe todos los usuarios sin paginación

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list" and self.request.user and self.request.user.is_authenticated:
            return qs.exclude(id=self.request.user.id)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        # Solo admins pueden manipular policy_ids; /me no debe permitirlo.
        ctx["allow_policy_ids"] = bool(self.request.user and self.request.user.is_staff and self.action != "me")
        return ctx

    def get_permissions(self):
        """
        - Acciones estándar (list, create, update, delete, retrieve): solo admin.
        - Acción personalizada 'me': usuario autenticado.
        """
        if self.action == "me":
            return [permissions.IsAuthenticated()]
        if self.action == "lookup":
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    @decorators.action(
        detail=False,
        methods=["get", "patch", "put"],
        url_path="me",
        permission_classes=[permissions.IsAuthenticated],
    )
    def me(self, request):
        """
        GET  → devuelve los datos del usuario autenticado.
        PATCH/PUT → permite actualizar parcialmente su perfil.
        """
        user = request.user

        if request.method.lower() == "get":
            serializer = self.get_serializer(user)
            return response.Response(serializer.data)

        # PATCH/PUT (actualización parcial o total, pero tratamos como parcial)
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data, status=status.HTTP_200_OK)

    @decorators.action(
        detail=False,
        methods=["get"],
        url_path="lookup",
        permission_classes=[permissions.AllowAny],
    )
    def lookup(self, request):
        """
        Permite obtener el DNI asociado a un email válido (solo lectura).
        """
        email = (request.query_params.get("email") or "").strip()
        if not email:
            return response.Response(
                {"detail": "Email requerido."}, status=status.HTTP_400_BAD_REQUEST
            )
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return response.Response(
                {"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )
        return response.Response({"dni": user.dni})
