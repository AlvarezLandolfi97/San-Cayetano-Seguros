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


class AdminProductSerializer(ProductSerializer):
    """
    Serializer laxo para el panel admin: acepta solo nombre/subtítulo y completa defaults.
    """
    policy_count = serializers.IntegerField(read_only=True, required=False)

    class Meta(ProductSerializer.Meta):
        fields = (
            "id",
            "code",
            "name",
            "subtitle",
            "bullets",
            "vehicle_type",
            "plan_type",
            "min_year",
            "max_year",
            "base_price",
            "franchise",
            "coverages",
            "published_home",
            "is_active",
            "policy_count",
        )
        extra_kwargs = {
            "vehicle_type": {"required": False},
            "plan_type": {"required": False},
            "min_year": {"required": False},
            "max_year": {"required": False},
            "base_price": {"required": False},
            "franchise": {"required": False},
            "coverages": {"required": False},
            "published_home": {"required": False},
            "is_active": {"required": False},
            "bullets": {"required": False},
            "code": {"required": False, "allow_blank": True, "allow_null": True},
        }

    def _apply_defaults(self, data, instance=None):
        """
        Completa valores mínimos para no exigir todos los campos al admin.
        """
        d = {**(data or {})}
        current = instance or {}
        d.setdefault("vehicle_type", getattr(current, "vehicle_type", "AUTO"))
        d.setdefault("plan_type", getattr(current, "plan_type", "TR"))
        d.setdefault("min_year", getattr(current, "min_year", 1995))
        d.setdefault("max_year", getattr(current, "max_year", 2100))
        d.setdefault("base_price", getattr(current, "base_price", 0))
        d.setdefault("franchise", getattr(current, "franchise", ""))
        d.setdefault("coverages", getattr(current, "coverages", ""))
        d.setdefault("published_home", getattr(current, "published_home", True))
        d.setdefault("is_active", getattr(current, "is_active", True))
        d.setdefault("bullets", getattr(current, "bullets", []))
        if not d.get("code"):
            d["code"] = self._generate_code(d.get("name") or "PLAN")
        return d

    def _generate_code(self, base):
        slug = "".join(ch for ch in (base or "").upper() if ch.isalnum()) or "PLAN"
        existing = Product.objects.filter(code__iexact=slug).exists()
        if existing:
            suffix = 1
            new_code = f"{slug}-{suffix}"
            while Product.objects.filter(code__iexact=new_code).exists():
                suffix += 1
                new_code = f"{slug}-{suffix}"
            return new_code
        return slug

    def create(self, validated_data):
        return super().create(self._apply_defaults(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._apply_defaults(validated_data, instance))


# 🔹 Serializer liviano para el Home (shape que espera el front)
class HomeProductSerializer(serializers.ModelSerializer):
    subtitle = serializers.CharField(read_only=True, allow_blank=True)
    tag = serializers.SerializerMethodField()
    features = serializers.SerializerMethodField()
    code = serializers.CharField(read_only=True)

    class Meta:
        model = Product
        fields = ("id", "code", "name", "subtitle", "tag", "features")

    # ===== Helpers de presentación =====

    def get_tag(self, obj):
        key = (obj.plan_type or "").upper()
        return PLAN_TAG.get(key, "")

    def get_features(self, obj):
        """
        Devuelve las bullets cargadas por el admin (hasta 5).
        Si no hay bullets, no mostramos nada.
        """
        if getattr(obj, "bullets", None):
            try:
                bullets = list(obj.bullets)
                cleaned = [str(b).strip() for b in bullets if str(b).strip()]
                return cleaned[:5]
            except Exception:
                return []
        return []

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
            # Manejar string de coverages sin dividir en caracteres
            if isinstance(cov, str):
                return [line.strip("-• ").strip() for line in cov.splitlines() if line.strip()]
            try:
                iterable = list(cov.all()) if hasattr(cov, "all") else list(cov)
                return [str(c).strip() for c in iterable if str(c).strip()]
            except Exception:
                # si es string plano
                if isinstance(cov, str):
                    return [line.strip("-• ").strip() for line in cov.splitlines() if line.strip()]

        return []
