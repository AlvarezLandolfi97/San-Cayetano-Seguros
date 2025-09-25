from rest_framework import viewsets, permissions
from .models import Policy
from .serializers import PolicySerializer

class PolicyViewSet(viewsets.ModelViewSet):
    queryset = Policy.objects.all().order_by('-id')
    serializer_class = PolicySerializer

    def get_permissions(self):
        if self.action in ['create','update','partial_update','destroy','list']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_authenticated and not user.is_staff:
            return qs.filter(holder=user)
        return qs
