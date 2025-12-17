from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Promueve a un usuario existente a admin (is_staff + is_superuser) usando su email."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Email del usuario a promover.")

    def handle(self, *args, **options):
        email = (options.get("email") or "").strip().lower()
        if not email:
            raise CommandError("Debes especificar --email")

        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise CommandError(f"No se encontró usuario con email {email}")

        user.is_staff = True
        user.is_superuser = True
        user.save(update_fields=["is_staff", "is_superuser"])

        self.stdout.write(self.style.SUCCESS(f"Usuario {email} ahora es admin (staff/superuser)."))
