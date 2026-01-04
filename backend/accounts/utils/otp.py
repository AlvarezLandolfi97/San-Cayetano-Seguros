"""
Secure helpers for one-time passwords (OTP).
"""

import hashlib
import logging
import secrets
from typing import Dict

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone

logger = logging.getLogger(__name__)

DEFAULT_OTP_TIMEOUT = 600


def _resolve_otp_pepper() -> str:
    """
    Return the configured OTP_PEPPER, or a safe fallback only when DEBUG/TESTING.
    """
    pepper = getattr(settings, "OTP_PEPPER", "")
    if pepper:
        return pepper
    if settings.DEBUG or getattr(settings, "RUNNING_TESTS", False):
        fallback = "dev-otp-pepper"
        logger.warning(
            "OTP_PEPPER is not configured; using dev fallback. Set OTP_PEPPER in production."
        )
        return fallback
    logger.error("OTP_PEPPER is required when DEBUG=False.")
    raise ImproperlyConfigured("OTP_PEPPER is required when DEBUG=False.")


def generate_otp(n_digits: int = 6) -> str:
    """
    Generate a numeric OTP with the desired number of digits.
    """
    if n_digits <= 0:
        raise ValueError("n_digits must be positive.")
    digits = "0123456789"
    return "".join(secrets.choice(digits) for _ in range(n_digits))


def otp_hash(otp: str, salt: str) -> str:
    """
    Derive a SHA-256 digest from the OTP, a salt, and the configured pepper.
    """
    if not otp or not salt:
        raise ValueError("OTP and salt must be provided.")
    pepper = _resolve_otp_pepper()
    raw = f"{pepper}|{salt}|{otp}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def constant_time_compare(a: str, b: str) -> bool:
    """
    Compare two values without leaking timing information.
    """
    if a is None or b is None:
        return False
    return secrets.compare_digest(a, b)


def build_otp_payload(otp: str, *, salt: str = None) -> Dict[str, object]:
    """
    Build the structured payload we persist in the cache for each OTP.
    """
    salt = salt or secrets.token_urlsafe(16)
    payload = {
        "hash": otp_hash(otp, salt),
        "salt": salt,
        "attempts": 0,
        "created_at": timezone.now().timestamp(),
    }
    return payload


def get_payload_remaining_ttl(payload: Dict[str, object], *, timeout: int = None) -> int:
    """
    Estimate the remaining TTL for a payload so we can respect the original window.
    """
    if timeout is None:
        timeout = getattr(settings, "OTP_TIMEOUT_SECONDS", DEFAULT_OTP_TIMEOUT)
    created_at = payload.get("created_at")
    if created_at is None:
        return timeout
    elapsed = timezone.now().timestamp() - float(created_at)
    remaining = timeout - elapsed
    return max(int(remaining), 0)
