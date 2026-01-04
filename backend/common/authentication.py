from rest_framework import permissions
from rest_framework.authentication import get_authorization_header
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class SoftJWTAuthentication(JWTAuthentication):
    """
    Like JWTAuthentication but treats invalid/expired/malformed tokens as anonymous requests.

    AllowAny endpoints suffer 401 responses because the global JWTAuthentication raises
    before permissions run when a client keeps sending a stale Bearer token.
    SoftJWTAuthentication swallows those errors so the view still runs with an anonymous user
    while valid tokens keep working.
    """

    def authenticate(self, request):
        header = get_authorization_header(request)
        if not header:
            return None

        try:
            return super().authenticate(request)
        except (InvalidToken, TokenError, AuthenticationFailed, UnicodeError, ValueError):
            return None


class SoftJWTAllowAnyMixin:
    """AllowAny endpoints that should tolerate stale/invalid JWT headers."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = [SoftJWTAuthentication]
