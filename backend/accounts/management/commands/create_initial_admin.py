import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Crea (o actualiza) un usuario administrador inicial para entrar al panel."

    def handle(self, *args, **options):
        User = get_user_model()

        email = os.getenv("INITIAL_ADMIN_EMAIL", "admin@demo.com").strip().lower()
        dni = os.getenv("INITIAL_ADMIN_DNI", "99999999").strip()
        password = os.getenv("INITIAL_ADMIN_PASSWORD", "demo1234")
        first_name = os.getenv("INITIAL_ADMIN_FIRST_NAME", "Admin")
        last_name = os.getenv("INITIAL_ADMIN_LAST_NAME", "Inicial")

        # Buscamos por email o DNI
        user = User.objects.filter(email__iexact=email).first() or User.objects.filter(dni=dni).first()

        if user:
            user.email = user.email or email
            user.first_name = user.first_name or first_name
            user.last_name = user.last_name or last_name
            user.is_staff = True
            user.is_superuser = True
            if password:
                user.set_password(password)
            user.save()
            msg = f"Usuario admin actualizado: {user.email or user.dni}"
        else:
            user = User.objects.create_user(
                dni=dni,
                password=password,
                email=email,
                first_name=first_name,
                last_name=last_name,
                is_staff=True,
                is_superuser=True,
            )
            msg = f"Usuario admin creado: {user.email or user.dni}"

        self.stdout.write(self.style.SUCCESS(msg))
