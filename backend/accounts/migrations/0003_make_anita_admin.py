from django.db import migrations


def make_anita_admin(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    try:
        user = User.objects.get(email="anitaormellob@gmail.com")
        user.is_staff = True
        user.is_superuser = True
        user.save()
    except User.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_alter_user_email"),
    ]

    operations = [
        migrations.RunPython(make_anita_admin),
    ]
