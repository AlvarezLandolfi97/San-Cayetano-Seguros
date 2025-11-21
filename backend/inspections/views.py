from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import Inspection
from .serializers import InspectionSerializer
from products.models import Product
from policies.models import Policy
from django.utils.crypto import get_random_string
from datetime import date

User = get_user_model()

class InspectionViewSet(viewsets.ModelViewSet):
    queryset = Inspection.objects.all().order_by('-created_at')
    serializer_class = InspectionSerializer

    def get_permissions(self):
        if self.action in ['list','retrieve','approve','reject']:
            return [permissions.IsAdminUser()]
        if self.action in ['create']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        applicant = self.request.user if self.request.user.is_authenticated else None
        serializer.save(applicant=applicant)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        insp: Inspection = self.get_object()
        product_id = request.data.get('product_id')
        product = None
        if product_id:
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                return Response({'detail':'product_id inválido'}, status=400)
        elif insp.selected_product:
            product = insp.selected_product
        else:
            return Response({'detail':'Debe indicar un product_id o tener selected_product'}, status=400)

        b = insp.birth_date
        years = date.today().year - b.year - ((date.today().month, date.today().day) < (b.month, b.day))
        if years < 18:
            return Response({'detail':'El solicitante no es mayor de edad.'}, status=400)

        user = User.objects.filter(dni=insp.dni).first()
        if not user:
            tmp_pass = get_random_string(10)
            user = User.objects.create_user(dni=insp.dni, password=tmp_pass, email=insp.email, first_name='', last_name='')
            user.phone = insp.phone
            user.birth_date = insp.birth_date
            user.save()
            # TODO: enviar email/WhatsApp con enlace de establecer contraseña

        number = f"POL-{insp.id:06d}"
        policy = Policy.objects.create(
            number=number,
            holder=user,
            license_plate=insp.license_plate,
            product=product,
            state='PEND'
        )

        insp.state = 'APR'
        insp.admin_notes = (request.data.get('notes') or '')
        insp.save()

        return Response({'detail':'Aprobada', 'policy_id': policy.id, 'policy_number': policy.number}, status=200)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def reject(self, request, pk=None):
        insp: Inspection = self.get_object()
        insp.state = 'REJ'
        insp.admin_notes = request.data.get('notes','')
        insp.save()
        return Response({'detail':'Rechazada'}, status=200)
