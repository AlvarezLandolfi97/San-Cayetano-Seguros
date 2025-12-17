import os
import random
import re
import logging
from rest_framework import status, views, response
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.core.cache import cache
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


def _mask_email(email: str):
    if not email or "@" not in email:
        return "correo desconocido"
    name, domain = email.split("@", 1)
    if len(name) <= 2:
        masked_name = name[0] + "***"
    else:
        masked_name = name[0] + "***" + name[-1]
    return f"{masked_name}@{domain}"


def _send_email_code(email: str, code: str):
    """
    Envía el código 2FA por email (ingresado en login).
    """
    if not email:
        logger.warning("No se pudo enviar código 2FA: email vacío.")
        return False
    subject = "Código de verificación - Acceso administrador"
    message = (
        f"Tu código de acceso es: {code}\n"
        "Tiene validez de 5 minutos.\n\n"
        "Si no solicitaste este ingreso, podés ignorar este mensaje."
    )
    try:
        send_mail(
            subject,
            message,
            "anitaormeba@gmail.com",  # remitente solicitado
            [email],
            fail_silently=False,
        )
        return True
    except Exception as exc:  # pragma: no cover - side effect externo
        logger.warning("No se pudo enviar el código por email: %s", exc)
        return False


def _send_whatsapp_code(phone: str, code: str):
    """
    Envía (o al menos registra) el código 2FA por WhatsApp.
    Si se configura WHATSAPP_WEBHOOK_URL, intentamos hacer POST con {to, message}.
    Caso contrario, se loguea para entorno de pruebas.
    """
    message = f"Tu código de acceso (admin) es: {code}. Vence en 5 minutos."
    webhook = os.getenv("WHATSAPP_WEBHOOK_URL")
    if webhook:
        try:
            requests.post(
                webhook,
                json={"to": phone, "message": message},
                timeout=5,
            )
            return True
        except Exception as exc:  # pragma: no cover - side effect externo
            logger.warning("No se pudo enviar el código por WhatsApp: %s", exc)
            return False
    logger.info("[2FA admin] Enviar a %s: %s", phone or "(sin teléfono)", message)
    return True


class EmailLoginView(APIView):
    """
    Endpoint de login compatible con el frontend mock (/auth/login).
    Permite iniciar sesión por email (o DNI como fallback) y devuelve access/refresh + datos de usuario.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        otp = (request.data.get("otp") or "").strip()
        if not email or not password:
            return Response({"detail": "Email y contraseña requeridos."}, status=status.HTTP_400_BAD_REQUEST)

        # Buscamos usuario por email; si no, intentamos por DNI con el mismo valor
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            user = User.objects.filter(dni=email).first()
        if not user:
            return Response({"detail": "Credenciales inválidas."}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password(password):
            return Response({"detail": "Credenciales inválidas."}, status=status.HTTP_401_UNAUTHORIZED)

        # Doble verificación para staff/admin
        if user.is_staff:
            cache_key = f"admin_otp:{user.id}"
            cached_code = cache.get(cache_key)

            if otp:
                if not cached_code or otp != cached_code:
                    return Response(
                        {
                            "detail": "Código inválido o expirado.",
                            "require_otp": True,
                            "otp_sent_to": _mask_email(email),
                            "otp_ttl_seconds": 300,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                cache.delete(cache_key)
            else:
                code = str(random.randint(100000, 999999))
                cache.set(cache_key, code, timeout=300)
                _send_email_code(email, code)
                return Response(
                    {
                        "detail": "Te enviamos un código a tu email. Ingresalo para continuar.",
                        "require_otp": True,
                        "otp_sent_to": _mask_email(email),
                        "otp_ttl_seconds": 300,
                    },
                    status=status.HTTP_202_ACCEPTED,
                )

        refresh = RefreshToken.for_user(user)
        data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        }
        return Response(data)


class PasswordResetRequestView(views.APIView):
    """
    Recibe un email y genera un token de reseteo si el usuario existe.
    Devuelve 200 siempre para evitar enumeración de usuarios.
    """

    permission_classes = []
    authentication_classes = []

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return response.Response({"detail": "Email requerido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return response.Response({"detail": "El email no está registrado."}, status=status.HTTP_404_NOT_FOUND)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = PasswordResetTokenGenerator().make_token(user)

        origin_env = os.getenv("FRONTEND_ORIGINS") or os.getenv("FRONTEND_ORIGIN") or ""
        origin = (origin_env.split(",")[0] or "").strip() or "http://localhost:5173"
        reset_link = f"{origin.rstrip('/')}/reset/confirm?uid={uid}&token={token}"

        # Enviamos email con el link de reseteo (usa el backend configurado)
        subject = "Recuperá tu contraseña"
        message = (
            "Solicitaste restablecer tu contraseña.\n\n"
            f"Usá este enlace para continuar: {reset_link}\n\n"
            "Si no fuiste vos, ignorá este mensaje."
        )
        try:
            send_mail(
                subject,
                message,
                None,  # usa DEFAULT_FROM_EMAIL
                [user.email],
                fail_silently=False,
            )
        except Exception:
            return response.Response({"detail": "No se pudo enviar el email. Revisá la configuración SMTP."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return response.Response({"detail": "Te enviamos un correo con instrucciones."}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(views.APIView):
    """
    Confirma el reseteo de contraseña usando uid y token.
    """

    permission_classes = []
    authentication_classes = []

    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")

        if not uidb64 or not token or not new_password:
            return response.Response({"detail": "Datos incompletos."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            return response.Response({"detail": "Enlace inválido o expirado."}, status=status.HTTP_400_BAD_REQUEST)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return response.Response({"detail": "Enlace inválido o expirado."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])
        return response.Response({"detail": "Contraseña actualizada."}, status=status.HTTP_200_OK)


class RegisterView(APIView):
    """
    Registro público de usuarios.
    Devuelve access/refresh + datos del usuario.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data or {}
        email = (data.get("email") or "").strip().lower()
        dni = (data.get("dni") or "").strip()
        password = data.get("password") or ""
        first_name = (data.get("first_name") or "").strip()
        last_name = (data.get("last_name") or "").strip()
        phone = (data.get("phone") or "").strip()
        birth_date = data.get("dob") or data.get("birth_date")

        if not email or not dni or not password:
            return Response({"detail": "Email, DNI y contraseña son obligatorios."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "El email ya está registrado."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(dni=dni).exists():
            return Response({"detail": "El DNI ya está registrado."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            dni=dni,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            birth_date=birth_date or None,
        )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )
