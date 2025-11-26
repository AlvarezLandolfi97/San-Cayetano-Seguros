from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, throttling
from .serializers import QuoteInputSerializer
from products.models import Product
from django.utils import timezone


class QuoteView(APIView):
    # 🔓 Ahora es pública (no requiere login)
    permission_classes = [permissions.AllowAny]
    # 🚦 Mantiene el scope para rate limit si está configurado en settings
    throttle_scope = "quotes"

    def post(self, request):
        s = QuoteInputSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        vtype = s.validated_data['vtype']
        year = s.validated_data['year']

        # Filtra productos compatibles con el tipo y año del vehículo
        qs = Product.objects.filter(
            vehicle_type=vtype,
            min_year__lte=year,
            max_year__gte=year
        )

        # Calcula el factor por antigüedad del vehículo
        current_year = timezone.now().year
        age = max(0, current_year - year)
        factor = 1.0 + (0.15 if age > 15 else (0.08 if age > 8 else 0.0))

        # Arma la respuesta con precios estimados
        result = []
        for p in qs:
            price = float(p.base_price) * factor
            result.append({
                'id': p.id,
                'name': p.name,
                'plan_type': p.plan_type,
                'vehicle_type': p.vehicle_type,
                'franchise': p.franchise,
                'estimated_price': round(price, 2),
            })

        return Response({'plans': result}, status=status.HTTP_200_OK)
