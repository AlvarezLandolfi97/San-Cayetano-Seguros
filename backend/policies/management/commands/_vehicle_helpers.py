from django.utils import timezone

from vehicles.models import Vehicle


def normalize_plate(plate):
    if not plate:
        return None
    return str(plate).strip().upper()


def ensure_policy_vehicle(policy, vehicle_data, *, defaults=None):
    if not vehicle_data or not policy.user_id:
        return None
    plate = normalize_plate(vehicle_data.get("plate"))
    if not plate:
        return None
    vehicle_defaults = {
        "vtype": vehicle_data.get("vtype") or "AUTO",
        "brand": vehicle_data.get("make") or "Desconocida",
        "model": vehicle_data.get("model") or "Sin modelo",
        "year": vehicle_data.get("year") or timezone.now().year,
        "use": vehicle_data.get("usage") or "Particular",
        "fuel": vehicle_data.get("fuel") or "",
        "color": vehicle_data.get("color"),
    }
    if defaults:
        vehicle_defaults.update(defaults)
    vehicle, _ = Vehicle.objects.get_or_create(
        owner_id=policy.user_id,
        license_plate=plate,
        defaults=vehicle_defaults,
    )
    if policy.vehicle_id != vehicle.id:
        policy.vehicle = vehicle
        policy.save(update_fields=["vehicle"])
    return vehicle


def cleanup_owner_vehicles(owner_ids):
    if not owner_ids:
        return
    Vehicle.objects.filter(owner_id__in=owner_ids).delete()
