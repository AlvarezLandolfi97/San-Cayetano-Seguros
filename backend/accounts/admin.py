from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("dni",)
    list_display = ("id", "dni", "email", "is_staff", "is_superuser", "date_joined")
    search_fields = ("dni", "email", "first_name", "last_name")

    # Ajustamos fieldsets para que no pida username
    fieldsets = (
        ("Credenciales", {"fields": ("dni", "password")}),
        ("Información personal", {"fields": ("first_name", "last_name", "email", "phone", "birth_date")}),
        ("Permisos", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        ("Alta de usuario", {
            "classes": ("wide",),
            "fields": ("dni", "password1", "password2", "is_staff", "is_superuser"),
        }),
    )
