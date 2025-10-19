# backend/accounts/views.py
from rest_framework import viewsets, permissions, decorators, response, status
from .models import User
from .serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserSerializer

    def get_permissions(self):
        """
        - Acciones estándar (list, create, update, delete, retrieve): solo admin.
        - Acción personalizada 'me': usuario autenticado.
        """
        if self.action == "me":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    @decorators.action(
        detail=False,
        methods=["get", "patch"],
        url_path="me",
        permission_classes=[permissions.IsAuthenticated],
    )
    def me(self, request):
        """
        GET  → devuelve los datos del usuario autenticado.
        PATCH → permite actualizar parcialmente su perfil.
        """
        user = request.user

        if request.method.lower() == "get":
            serializer = self.get_serializer(user)
            return response.Response(serializer.data)

        # PATCH (actualización parcial)
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data, status=status.HTTP_200_OK)
