import os
import random
import re
import logging
import requests
from rest_framework import permissions, status, views, response
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.core.cache import cache
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .serializers import UserSerializer
from django.urls import reverse

User = get_user_model()
logger = logging.getLogger(__name__)

def _bool(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in ("1", "true", "t", "yes", "y", "on")


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
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@sancayetano.com")
    try:
        send_mail(
            subject,
            message,
            from_email,
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


def _build_reset_link(user):
    origin_env = os.getenv("FRONTEND_ORIGINS") or os.getenv("FRONTEND_ORIGIN") or ""
    origin = (origin_env.split(",")[0] or "").strip() or "http://localhost:5173"
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = PasswordResetTokenGenerator().make_token(user)
    return f"{origin.rstrip('/')}/reset/confirm?uid={uid}&token={token}"


def _send_onboarding(user, *, send_otp: bool = True):
    """
    Envía link de acceso + OTP opcional por email y WhatsApp (si hay webhook).
    """
    link = _build_reset_link(user)
    otp = None
    if send_otp:
        otp = str(random.randint(100000, 999999))
        cache.set(f"onboarding_otp:{user.id}", otp, timeout=600)

    # Email con link + OTP
    if user.email:
        parts = [
            "Bienvenido/a a San Cayetano Seguros.",
            f"Establecé tu contraseña acá: {link}",
        ]
        if otp:
            parts.append(f"Tu código de acceso es: {otp} (10 minutos de validez).")
        try:
            send_mail(
                "Accedé a tu cuenta",
                "\n".join(parts),
                None,
                [user.email],
                fail_silently=False,
            )
        except Exception as exc:
            logger.error("onboarding_email_failed", extra={"user_id": user.id, "email": user.email, "error": str(exc)})

    # WhatsApp opcional
    phone = getattr(user, "phone", "") or ""
    webhook = os.getenv("WHATSAPP_WEBHOOK_URL")
    if phone and webhook:
        msg = f"Accedé a tu cuenta: {link}"
        if otp:
            msg += f" | Código: {otp}"
        try:
            requests.post(webhook, json={"to": phone, "message": msg}, timeout=5)
        except Exception as exc:  # pragma: no cover
            logger.warning("onboarding_whatsapp_failed", extra={"user_id": user.id, "phone": phone, "error": str(exc)})
    return otp


class EmailLoginView(APIView):
    """
    Endpoint de login compatible con el frontend mock (/auth/login).
    Permite iniciar sesión por email (o DNI como fallback) y devuelve access/refresh + datos de usuario.
    """
    permission_classes = [AllowAny]
    throttle_scope = "login"

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
        if not user.is_active:
            return Response({"detail": "La cuenta está inactiva. Contactá al administrador."}, status=status.HTTP_403_FORBIDDEN)

        # Doble verificación para staff/admin
        if user.is_staff:
            cache_key = f"admin_otp:{user.id}"
            cached_code = cache.get(cache_key)
            rate_key = f"admin_otp_rate:{email}"
            attempts = cache.get(rate_key, 0)
            max_attempts = 5
            cooldown = 600  # 10 minutos

            if otp:
                if not cached_code or otp != cached_code:
                    cache.set(rate_key, attempts + 1, timeout=cooldown)
                    if attempts + 1 >= max_attempts:
                        return Response(
                            {
                                "detail": "Demasiados intentos. Esperá unos minutos e intentá nuevamente.",
                                "require_otp": True,
                            },
                            status=status.HTTP_429_TOO_MANY_REQUESTS,
                        )
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
                if attempts >= max_attempts:
                    return Response(
                        {
                            "detail": "Demasiados intentos. Esperá unos minutos e intentá nuevamente.",
                            "require_otp": True,
                        },
                        status=status.HTTP_429_TOO_MANY_REQUESTS,
                    )
                code = str(random.randint(100000, 999999))
                cache.set(cache_key, code, timeout=300)
                cache.set(rate_key, attempts + 1, timeout=cooldown)
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
    throttle_scope = "reset"

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return response.Response({"detail": "Email requerido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Respuesta ciega para no permitir enumeración de correos.
            return response.Response({"detail": "Te enviamos un correo con instrucciones."}, status=status.HTTP_200_OK)

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
    throttle_scope = "reset"

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
    throttle_scope = "register"

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

        try:
            validate_email(email)
        except ValidationError:
            return Response({"detail": "Email inválido."}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8 or password.isalpha() or password.isdigit():
            return Response(
                {"detail": "La contraseña debe tener mínimo 8 caracteres e incluir letras y números."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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


class LogoutView(APIView):
    """
    Endpoint de logout para el front.
    No invalida JWT (no hay blacklist configurado); responde 200 para que el cliente limpie sesión.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({"detail": "Sesión cerrada."}, status=status.HTTP_200_OK)


class GoogleLoginView(APIView):
    """
    Stub de login con Google. Si no está habilitado por entorno, responde 501.
    Para habilitarlo de verdad, configurar la verificación del id_token y generar tokens JWT.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        enabled = _bool(os.getenv("ENABLE_GOOGLE_LOGIN") or os.getenv("VITE_ENABLE_GOOGLE"))
        if not enabled:
            return Response({"detail": "Login con Google no habilitado en el backend."}, status=status.HTTP_501_NOT_IMPLEMENTED)

        id_token = (request.data.get("id_token") or "").strip()
        if not id_token:
            return Response({"detail": "Falta id_token de Google."}, status=status.HTTP_400_BAD_REQUEST)

        client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("VITE_GOOGLE_CLIENT_ID")
        if not client_id:
            return Response(
                {"detail": "GOOGLE_CLIENT_ID no está definido, no se puede validar Google Login."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        try:
            resp = requests.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": id_token},
                timeout=5,
            )
            data = resp.json()
        except Exception as exc:  # pragma: no cover - red externa
            return Response({"detail": f"No se pudo validar el token de Google: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)

        if resp.status_code != 200:
            return Response({"detail": "Token de Google inválido o expirado."}, status=status.HTTP_401_UNAUTHORIZED)

        aud = data.get("aud")
        if client_id and aud != client_id:
            return Response({"detail": "El token no corresponde a este cliente de Google."}, status=status.HTTP_401_UNAUTHORIZED)

        issuer = (data.get("iss") or "").lower()
        if issuer not in ("https://accounts.google.com", "accounts.google.com"):
            return Response({"detail": "Issuer inválido en el token de Google."}, status=status.HTTP_401_UNAUTHORIZED)

        email = (data.get("email") or "").strip().lower()
        email_verified = str(data.get("email_verified", "")).lower() in ("1", "true", "yes")
        if not email or not email_verified:
            return Response({"detail": "Google no devolvió un email verificado."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {"detail": "No existe un usuario con ese email. Registrate primero y luego podrás usar Google."},
                status=status.HTTP_404_NOT_FOUND,
            )

        refresh = RefreshToken.for_user(user)
        data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        }
        return Response(data)


class ResendOnboardingView(APIView):
    """
    Admin: reenvía link de acceso + OTP por email y opcional WhatsApp.
    Acepta user_id o email en el payload.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        uid = request.data.get("user_id")
        email = (request.data.get("email") or "").strip().lower()
        user = None
        if uid:
            user = User.objects.filter(id=uid).first()
        if not user and email:
            user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        otp = _send_onboarding(user, send_otp=True)
        detail = "Enviamos el link de acceso."
        if otp:
            detail += " Incluimos un código de 6 dígitos (10 minutos)."
        return Response({"detail": detail})
