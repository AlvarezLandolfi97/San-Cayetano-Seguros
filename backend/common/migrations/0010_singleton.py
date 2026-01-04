from django.db import migrations, models


def enforce_singleton(apps, schema_editor):
    for model_name in ("ContactInfo", "AppSettings"):
        Model = apps.get_model("common", model_name)
        instances = list(Model.objects.order_by("id"))
        if not instances:
            continue
        primary = instances[0]
        Model.objects.exclude(pk=primary.pk).delete()
        if not primary.singleton:
            primary.singleton = True
            primary.save(update_fields=["singleton"])


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0009_remove_price_update_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="contactinfo",
            name="singleton",
            field=models.BooleanField(default=True, editable=False),
        ),
        migrations.AddField(
            model_name="appsettings",
            name="singleton",
            field=models.BooleanField(default=True, editable=False),
        ),
        migrations.RunPython(enforce_singleton, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="contactinfo",
            name="singleton",
            field=models.BooleanField(default=True, editable=False, unique=True),
        ),
        migrations.AlterField(
            model_name="appsettings",
            name="singleton",
            field=models.BooleanField(default=True, editable=False, unique=True),
        ),
    ]
