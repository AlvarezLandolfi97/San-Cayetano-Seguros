from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import QuoteInputSerializer
from products.models import Product

class QuoteView(APIView):
    def post(self, request):
        s = QuoteInputSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        vtype = s.validated_data['vtype']
        year = s.validated_data['year']

        qs = Product.objects.filter(vehicle_type=vtype, min_year__lte=year, max_year__gte=year)

        age = max(0, 2025 - year)
        factor = 1.0 + (0.15 if age > 15 else (0.08 if age > 8 else 0.0))

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
