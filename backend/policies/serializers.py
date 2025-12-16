# backend/policies/serializers.py
from datetime import date
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Policy, PolicyVehicle, PolicyInstallment
from accounts.models import User
from products.models import Product
from .billing import compute_installment_status, derive_policy_billing_status, regenerate_installments


class PolicyVehicleSerializer(serializers.ModelSerializer):
    def to_internal_value(self, data):
        # Normalizamos strings vacíos a None para evitar errores de validación
        if isinstance(data, dict):
            data = {k: (v if v != "" else None) for k, v in data.items()}
        return super().to_internal_value(data)

    class Meta:
        model = PolicyVehicle
        fields = [
            "plate",
            "make",
            "model",
            "version",
            "year",
            "city",
            "has_garage",
            "is_zero_km",
            "usage",
            "has_gnc",
            "gnc_amount",
        ]
        extra_kwargs = {
            "plate": {"required": False, "allow_blank": True, "allow_null": True},
            "make": {"required": False, "allow_blank": True, "allow_null": True},
            "model": {"required": False, "allow_blank": True, "allow_null": True},
            "version": {"required": False, "allow_blank": True, "allow_null": True},
            "year": {"required": False, "allow_null": True},
            "city": {"required": False, "allow_blank": True, "allow_null": True},
            "usage": {"required": False, "allow_blank": True, "allow_null": True},
        }


class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name"]


class PolicyInstallmentSerializer(serializers.ModelSerializer):
    effective_status = serializers.SerializerMethodField()

    class Meta:
        model = PolicyInstallment
        fields = [
            "id",
            "sequence",
            "period_start_date",
            "period_end_date",
            "payment_window_start",
            "payment_window_end",
            "due_date_display",
            "due_date_real",
            "amount",
            "status",
            "effective_status",
            "paid_at",
            "payment",
        ]

    def get_effective_status(self, obj):
        return compute_installment_status(obj)


class PolicySerializer(serializers.ModelSerializer):
    vehicle = PolicyVehicleSerializer(required=False)
    installments = serializers.SerializerMethodField()
    user = UserMinimalSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    product = serializers.PrimaryKeyRelatedField(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=Product.objects.all(),
        allow_null=True,
        required=False,
    )
    product_name = serializers.SerializerMethodField()
    client_end_date = serializers.SerializerMethodField()
    payment_start_date = serializers.SerializerMethodField()
    payment_end_date = serializers.SerializerMethodField()
    price_update_from = serializers.SerializerMethodField()
    price_update_to = serializers.SerializerMethodField()
    real_end_date = serializers.SerializerMethodField()
    has_pending_charge = serializers.SerializerMethodField()
    has_paid_in_window = serializers.SerializerMethodField()
    billing_status = serializers.SerializerMethodField()

    class Meta:
        model = Policy
        fields = [
            "id",
            "number",
            "user",
            "user_id",
            "product",
            "product_id",
            "product_name",
            "premium",
            "status",
            "start_date",
            "end_date",
            "client_end_date",
            "real_end_date",
            "payment_start_date",
            "payment_end_date",
            "price_update_from",
            "price_update_to",
            "has_pending_charge",
            "has_paid_in_window",
            "claim_code",
            "billing_status",
            "installments",
            "vehicle",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
        extra_kwargs = {
            "number": {"required": False, "allow_null": True, "allow_blank": True},
        }

    def get_product_name(self, obj):
        return getattr(obj.product, "name", None)

    def get_client_end_date(self, obj):
        return self._timeline_value(obj, "client_end_date")

    def get_payment_start_date(self, obj):
        return self._timeline_value(obj, "payment_start_date")

    def get_payment_end_date(self, obj):
        return self._timeline_value(obj, "payment_end_date")

    def get_price_update_from(self, obj):
        return self._timeline_value(obj, "price_update_from")

    def get_price_update_to(self, obj):
        return self._timeline_value(obj, "price_update_to")

    def get_real_end_date(self, obj):
        return self._timeline_value(obj, "real_end_date") or getattr(obj, "end_date", None)

    def get_has_pending_charge(self, obj):
        try:
            return obj.charges.filter(status="pending").exists()
        except Exception:
            return False

    def get_has_paid_in_window(self, obj):
        try:
            timeline = self.context.get("timeline_map", {}).get(obj.id, {})
            start = timeline.get("payment_start_date")
            end = timeline.get("payment_end_date")
            if not start or not end:
                return False
            start_d = date.fromisoformat(start) if isinstance(start, str) else start
            end_d = date.fromisoformat(end) if isinstance(end, str) else end
            return obj.charges.filter(
                status="paid",
                due_date__gte=start_d,
                due_date__lte=end_d,
            ).exists()
        except Exception:
            return False

    def get_billing_status(self, obj):
        installments_mgr = getattr(obj, "installments", [])
        installments = list(installments_mgr.all()) if hasattr(installments_mgr, "all") else list(installments_mgr)
        statuses = []
        for inst in installments:
            inst.status = compute_installment_status(inst)
            statuses.append(inst)
        return derive_policy_billing_status(statuses)

    def get_installments(self, obj):
        installments_mgr = getattr(obj, "installments", [])
        installments = list(installments_mgr.all()) if hasattr(installments_mgr, "all") else list(installments_mgr)
        # Actualizamos en memoria para reflejar el estado correcto en la API
        for inst in installments:
            inst.status = compute_installment_status(inst)
        return PolicyInstallmentSerializer(installments, many=True).data

    def _timeline_value(self, obj, key):
        return self.context.get("timeline_map", {}).get(obj.id, {}).get(key)

    def create(self, validated_data):
        validated_data = self._ensure_number(validated_data)
        vehicle_data = self._clean_vehicle_data(validated_data.pop("vehicle", None))
        policy = super().create(validated_data)
        regenerate_installments(policy)
        if vehicle_data:
            PolicyVehicle.objects.create(policy=policy, **vehicle_data)
        return policy

    def update(self, instance, validated_data):
        validated_data = self._ensure_number(validated_data, allow_keep=True, instance=instance)
        vehicle_data = self._clean_vehicle_data(validated_data.pop("vehicle", None))
        policy = super().update(instance, validated_data)
        # Si cambia vigencia o precio mensual regeneramos cuotas
        regenerate_installments(policy)
        if vehicle_data is not None:
            PolicyVehicle.objects.update_or_create(
                policy=policy, defaults=vehicle_data
            )
        return policy

    def _clean_vehicle_data(self, vehicle_data):
        """
        Evita errores cuando el front envía strings vacíos; si no hay datos
        significativos, devolvemos None para omitir la actualización/creación.
        """
        if not vehicle_data:
            return None
        cleaned = {}
        for key, value in vehicle_data.items():
            if isinstance(value, str):
                value = value.strip()
            if value in ("", None):
                continue
            if key == "year":
                try:
                    value = int(value)
                except (TypeError, ValueError):
                    continue
            cleaned[key] = value
        if not cleaned:
            return None
        # Si se cargan datos de vehículo, año es obligatorio para evitar IntegrityError.
        if "year" not in cleaned:
            raise ValidationError({"vehicle": "El año del vehículo es obligatorio si cargás datos de vehículo."})
        return cleaned

    def _generate_number(self):
        import secrets

        for _ in range(5):
            candidate = f"SC-{secrets.token_hex(3).upper()}"
            if not Policy.objects.filter(number=candidate).exists():
                return candidate
        # fallback, aunque muy improbable
        return f"SC-{secrets.token_hex(4).upper()}"

    def _ensure_number(self, validated_data, allow_keep=False, instance=None):
        """
        - Si viene number con contenido, lo deja.
        - Si viene number vacío o None, genera uno nuevo.
        - En update, si allow_keep=True y no viene number, conserva el actual.
        """
        number = validated_data.get("number", None)
        if number not in (None, ""):
            return validated_data
        if allow_keep and instance is not None and instance.number:
            validated_data.pop("number", None)
            return validated_data
        validated_data["number"] = self._generate_number()
        return validated_data


class PolicyClientListSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    plate = serializers.SerializerMethodField()
    client_end_date = serializers.SerializerMethodField()
    real_end_date = serializers.SerializerMethodField()
    payment_start_date = serializers.SerializerMethodField()
    payment_end_date = serializers.SerializerMethodField()
    price_update_from = serializers.SerializerMethodField()
    price_update_to = serializers.SerializerMethodField()

    class Meta:
        model = Policy
        fields = [
            "id",
            "number",
            "product",
            "plate",
            "premium",
            "status",
            "start_date",
            "end_date",
            "client_end_date",
            "real_end_date",
            "payment_start_date",
            "payment_end_date",
            "price_update_from",
            "price_update_to",
        ]

    def get_client_end_date(self, obj):
        return self._timeline_value(obj, "client_end_date") or obj.end_date

    def get_payment_start_date(self, obj):
        return self._timeline_value(obj, "payment_start_date")

    def get_payment_end_date(self, obj):
        return self._timeline_value(obj, "payment_end_date")

    def get_price_update_from(self, obj):
        return self._timeline_value(obj, "price_update_from")

    def get_price_update_to(self, obj):
        return self._timeline_value(obj, "price_update_to")

    def get_real_end_date(self, obj):
        return self._timeline_value(obj, "real_end_date") or getattr(obj, "end_date", None)

    def get_product(self, obj):
        return getattr(obj.product, "name", None)

    def get_plate(self, obj):
        return getattr(getattr(obj, "vehicle", None), "plate", None)

    def _timeline_value(self, obj, key):
        return self.context.get("timeline_map", {}).get(obj.id, {}).get(key)


class PolicyClientDetailSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    plate = serializers.SerializerMethodField()
    vehicle = serializers.SerializerMethodField()
    real_status = serializers.CharField(source="status")
    client_end_date = serializers.SerializerMethodField()
    real_end_date = serializers.SerializerMethodField()
    payment_start_date = serializers.SerializerMethodField()
    payment_end_date = serializers.SerializerMethodField()
    price_update_from = serializers.SerializerMethodField()
    price_update_to = serializers.SerializerMethodField()

    class Meta:
        model = Policy
        fields = [
            "id",
            "number",
            "status",
            "real_status",
            "premium",
            "start_date",
            "end_date",
            "client_end_date",
            "real_end_date",
            "payment_start_date",
            "payment_end_date",
            "price_update_from",
            "price_update_to",
            "product",
            "plate",
            "vehicle",
            "city",
            "has_garage",
            "is_zero_km",
            "usage",
            "has_gnc",
            "gnc_amount",
            "claim_code",
            "user",
        ]

    city = serializers.SerializerMethodField()
    has_garage = serializers.SerializerMethodField()
    is_zero_km = serializers.SerializerMethodField()
    usage = serializers.SerializerMethodField()
    has_gnc = serializers.SerializerMethodField()
    gnc_amount = serializers.SerializerMethodField()

    def get_client_end_date(self, obj):
        return self._timeline_value(obj, "client_end_date") or obj.end_date

    def get_payment_start_date(self, obj):
        return self._timeline_value(obj, "payment_start_date")

    def get_payment_end_date(self, obj):
        return self._timeline_value(obj, "payment_end_date")

    def get_price_update_from(self, obj):
        return self._timeline_value(obj, "price_update_from")

    def get_price_update_to(self, obj):
        return self._timeline_value(obj, "price_update_to")

    def get_real_end_date(self, obj):
        return self._timeline_value(obj, "real_end_date") or getattr(obj, "end_date", None)

    def _get_vehicle(self, obj):
        try:
            return obj.vehicle
        except Exception:
            return None

    def get_product(self, obj):
        return getattr(obj.product, "name", None)

    def get_plate(self, obj):
        vehicle = self._get_vehicle(obj)
        return getattr(vehicle, "plate", None)

    def get_vehicle(self, obj):
        vehicle = self._get_vehicle(obj)
        return PolicyVehicleSerializer(vehicle).data if vehicle else None

    def get_city(self, obj):
        vehicle = self._get_vehicle(obj)
        return getattr(vehicle, "city", None)

    def get_has_garage(self, obj):
        vehicle = self._get_vehicle(obj)
        return getattr(vehicle, "has_garage", None)

    def get_is_zero_km(self, obj):
        vehicle = self._get_vehicle(obj)
        return getattr(vehicle, "is_zero_km", None)

    def get_usage(self, obj):
        vehicle = self._get_vehicle(obj)
        return getattr(vehicle, "usage", None)

    def get_has_gnc(self, obj):
        vehicle = self._get_vehicle(obj)
        return getattr(vehicle, "has_gnc", None)

    def get_gnc_amount(self, obj):
        vehicle = self._get_vehicle(obj)
        return getattr(vehicle, "gnc_amount", None)

    def _timeline_value(self, obj, key):
        return self.context.get("timeline_map", {}).get(obj.id, {}).get(key)
