# backend/products/serializers.py
from rest_framework import serializers
from .models import Product

# Mapeos de presentación para el Home (tolerante a distintos plan_type)
PLAN_SUBTITLE = {
    "RC": "Responsabilidad Civil (RC)",
    "TC": "Terceros Completo",
    "TR": "Todo Riesgo",
    "BASIC": "Cobertura básica",
    "FULL": "Cobertura completa",
}

PLAN_TAG = {
    "RC": "Legal básico",
    "TC": "Popular",
    "TR": "Premium",
    "BASIC": "Económico",
    "FULL": "Completo",
}

# 🔹 Serializer completo (ya existente)
class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


# 🔹 Serializer liviano para el Home (shape que espera el front)
class HomeProductSerializer(serializers.ModelSerializer):
    subtitle = serializers.SerializerMethodField()
    tag = serializers.SerializerMethodField()
    features = serializers.SerializerMethodField()
    # lo mantenemos como helper interno aunque no se exponga directamente
    coverages_lite = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ("id", "name", "subtitle", "tag", "features")

    # ===== Helpers de presentación =====

    def get_subtitle(self, obj):
        key = (obj.plan_type or "").upper()
        return PLAN_SUBTITLE.get(key, "")

    def get_tag(self, obj):
        key = (obj.plan_type or "").upper()
        return PLAN_TAG.get(key, "")

    def get_features(self, obj):
        """
        Devuelve una lista corta (hasta 5) de bullets para la tarjeta del Home.
        Prioriza coverages_lite; si no hay, deriva desde coverages.
        """
        covs = self.get_coverages_lite(obj)
        return covs[:5] if covs else []

    def get_coverages_lite(self, obj):
        """
        Devuelve una versión resumida de coberturas:
        - Usa obj.coverages_lite si existe y no está vacío.
        - Si no, intenta derivar desde obj.coverages (iterable/relación).
        - Si no hay nada, lista vacía.
        """
        val = getattr(obj, "coverages_lite", None)
        if val:
            # admitir tanto list como string multiline
            if isinstance(val, (list, tuple)):
                return [str(x).strip() for x in val if str(x).strip()]
            if isinstance(val, str):
                return [line.strip("-• ").strip() for line in val.splitlines() if line.strip()]
            # último recurso: castear
            try:
                return [str(x).strip() for x in list(val) if str(x).strip()]
            except Exception:
                pass

        cov = getattr(obj, "coverages", None)
        if cov:
            try:
                iterable = list(cov.all()) if hasattr(cov, "all") else list(cov)
                return [str(c).strip() for c in iterable if str(c).strip()]
            except Exception:
                # si es string plano
                if isinstance(cov, str):
                    return [line.strip("-• ").strip() for line in cov.splitlines() if line.strip()]

        return []
