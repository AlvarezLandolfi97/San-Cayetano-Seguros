import logging
from decimal import Decimal, ROUND_HALF_UP

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, throttling
from django.shortcuts import get_object_or_404
from django.utils import timezone

from common.authentication import SoftJWTAllowAnyMixin
from .serializers import QuoteInputSerializer, QuoteShareCreateSerializer, QuoteShareSerializer
from .models import QuoteShare
from products.models import Product


logger = logging.getLogger(__name__)


class QuoteView(SoftJWTAllowAnyMixin, APIView):
    # 🔓 Ahora es pública (no requiere login)
    # 🚦 Mantiene el scope para rate limit si está configurado en settings
    throttle_scope = "quotes"

    def post(self, request):
        s = QuoteInputSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        vtype = s.validated_data['vtype']
        year = s.validated_data['year']

        # Filtra productos compatibles con el tipo/año y que estén vigentes y publicados
        qs = Product.objects.filter(
            vehicle_type=vtype,
            min_year__lte=year,
            max_year__gte=year,
            is_active=True,
            published_home=True,
        )

        # Calcula el factor por antigüedad del vehículo usando Decimal para evitar errores de float
        current_year = timezone.now().year
        age = max(0, current_year - year)
        if age > 15:
            factor = Decimal("1.15")
        elif age > 8:
            factor = Decimal("1.08")
        else:
            factor = Decimal("1.00")

        # Arma la respuesta con precios estimados
        result = []
        for p in qs:
            price = (p.base_price or Decimal("0")) * factor
            estimated_price = price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            result.append(
                {
                    'id': p.id,
                    'name': p.name,
                    'plan_type': p.plan_type,
                    'vehicle_type': p.vehicle_type,
                    'franchise': p.franchise,
                    'estimated_price': str(estimated_price),
                }
            )

        return Response({'plans': result}, status=status.HTTP_200_OK)


class QuoteShareCreateView(SoftJWTAllowAnyMixin, APIView):
    throttle_scope = "quotes"

    def post(self, request):
        serializer = QuoteShareCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response({"id": obj.token}, status=status.HTTP_201_CREATED)


class QuoteShareDetailView(SoftJWTAllowAnyMixin, APIView):

    def get(self, request, token):
        obj = get_object_or_404(QuoteShare, token=token)
        if obj.expires_at and obj.expires_at <= timezone.now():
            logger.info("quote_share_expired", extra={"token": token})
            return Response(
                {"detail": "La ficha de cotización expiró."},
                status=status.HTTP_410_GONE,
            )
        data = QuoteShareSerializer(obj, context={"request": request}).data
        return Response(data, status=status.HTTP_200_OK)
