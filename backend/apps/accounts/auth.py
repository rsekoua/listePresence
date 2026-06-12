"""Authentification JWT « maison » pour Django Ninja.

Implémente la génération et la vérification des tokens d'accès / de
rafraîchissement, ainsi qu'une classe `HttpBearer` protégeant les routes
du tableau de bord (cf. AUTH-01 / AUTH-02).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from ninja.security import HttpBearer

User = get_user_model()

ACCESS = "access"
REFRESH = "refresh"


def _encode(user_id: str, token_type: str, lifetime: timedelta, version: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": token_type,
        "ver": version,
        "iat": now,
        "exp": now + lifetime,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: str, version: int = 0) -> str:
    return _encode(
        user_id, ACCESS, timedelta(hours=settings.JWT_ACCESS_LIFETIME_HOURS), version
    )


def create_refresh_token(user_id: str, version: int = 0) -> str:
    return _encode(
        user_id, REFRESH, timedelta(days=settings.JWT_REFRESH_LIFETIME_DAYS), version
    )


def decode_token(token: str, expected_type: str | None = None) -> dict:
    """Décode et valide un token JWT. Lève jwt.PyJWTError si invalide/expiré."""
    payload = jwt.decode(
        token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
    )
    if expected_type and payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Type de token incorrect")
    return payload


def get_user_from_token(token: str, expected_type: str = ACCESS):
    """Retourne l'utilisateur actif associé à un token, sinon None.

    Le token est rejeté si sa version (« ver ») ne correspond plus à celle de
    l'utilisateur : c'est le cas après un changement/réinitialisation de mot de
    passe, qui révoque ainsi tous les jetons émis auparavant.
    """
    try:
        payload = decode_token(token, expected_type)
    except jwt.PyJWTError:
        return None
    try:
        user = User.objects.get(id=payload["sub"], is_active=True)
    except (User.DoesNotExist, KeyError, ValueError):
        return None
    if payload.get("ver") != user.token_version:
        return None
    return user


class JWTAuth(HttpBearer):
    """Sécurité Bearer : valide le token d'accès et expose request.auth = user."""

    def authenticate(self, request, token):
        user = get_user_from_token(token, ACCESS)
        if user is not None:
            request.user = user
        return user
