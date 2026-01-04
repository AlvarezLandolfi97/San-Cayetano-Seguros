from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Promueve un usuario existente a staff/superuser con control de flags."

    def add_arguments(self, parser):
        staff_group = parser.add_mutually_exclusive_group()
        staff_group.add_argument(
            "--staff",
            dest="staff",
            action="store_true",
            help="Marcar al usuario como staff (default: habilitado).",
        )
        staff_group.add_argument(
            "--no-staff",
            dest="staff",
            action="store_false",
            help="Desactivar is_staff (se comporta como un toggle).",
        )
        superuser_group = parser.add_mutually_exclusive_group()
        superuser_group.add_argument(
            "--superuser",
            dest="superuser",
            action="store_true",
            help="Marcar al usuario como superuser (default: habilitado).",
        )
        superuser_group.add_argument(
            "--no-superuser",
            dest="superuser",
            action="store_false",
            help="Desactivar is_superuser (se comporta como un toggle).",
        )
        parser.add_argument("--email", required=True, help="Email del usuario a promover.")
        parser.set_defaults(staff=None, superuser=None)

    def handle(self, *args, **options):
        email = (options.get("email") or "").strip().lower()
        if not email:
            raise CommandError("Debés especificar --email con un valor válido.")

        staff = options.get("staff")
        superuser = options.get("superuser")
        staff = True if staff is None else staff
        superuser = True if superuser is None else superuser

        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise CommandError(f"No se encontró un usuario con email {email}.")

        old_staff = user.is_staff
        old_superuser = user.is_superuser
        user.is_staff = staff
        user.is_superuser = superuser
        changed_fields = []
        if old_staff != staff:
            changed_fields.append("is_staff")
        if old_superuser != superuser:
            changed_fields.append("is_superuser")
        if changed_fields:
            user.save(update_fields=changed_fields)

        self.stdout.write(
            self.style.SUCCESS(
                (
                    "Updated user {email}: is_staff {old_staff}→{staff}, "
                    "is_superuser {old_superuser}→{superuser}"
                ).format(
                    email=email,
                    old_staff=old_staff,
                    staff=staff,
                    old_superuser=old_superuser,
                    superuser=superuser,
                )
            )
        )
