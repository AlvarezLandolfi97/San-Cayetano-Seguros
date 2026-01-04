from django.db import migrations, models
from django.db.models.functions import Lower


def _normalize_value(value: str) -> str:
    return "".join(ch for ch in (value or "").upper() if ch.isalnum())


def _generate_candidate(base: str, used_lower: set, max_length: int) -> str:
    normalized = base or "PRODUCT"
    candidate = normalized[:max_length]
    suffix = 0
    while candidate.lower() in used_lower:
        suffix += 1
        suffix_str = f"-{suffix}"
        trim_len = max(1, max_length - len(suffix_str))
        trimmed = normalized[:trim_len] or "PRODUCT"
        candidate = f"{trimmed}{suffix_str}"
    return candidate


def backfill_product_code(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    max_length = Product._meta.get_field("code").max_length
    seen_lower = set()
    for product in Product.objects.order_by("id"):
        base = _normalize_value(product.code) or _normalize_value(product.name) or "PRODUCT"
        candidate = _generate_candidate(base, seen_lower, max_length)
        seen_lower.add(candidate.lower())
        if product.code != candidate:
            product.code = candidate
            product.save(update_fields=["code"])


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0002_product_bullets_product_code_product_is_active_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_product_code, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name="product",
            name="code",
            field=models.CharField(max_length=30),
        ),
        migrations.AddConstraint(
            model_name="product",
            constraint=models.UniqueConstraint(
                Lower("code"),
                name="uniq_product_code_lower",
            ),
        ),
    ]
