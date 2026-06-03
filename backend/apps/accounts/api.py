"""Endpoints d'authentification (AUTH-01 / AUTH-02)."""

from django.contrib.auth import authenticate
from ninja import Router, Schema
from ninja.errors import HttpError

from .auth import (
    JWTAuth,
    REFRESH,
    create_access_token,
    create_refresh_token,
    get_user_from_token,
)

router = Router(tags=["authentification"])


# --- Schémas ---------------------------------------------------------------


class LoginIn(Schema):
    username: str
    password: str


class TokenOut(Schema):
    access: str
    refresh: str
    token_type: str = "bearer"


class RefreshIn(Schema):
    refresh: str


class AccessOut(Schema):
    access: str
    token_type: str = "bearer"


class UserOut(Schema):
    id: str
    username: str
    email: str


class MessageOut(Schema):
    detail: str


# --- Endpoints -------------------------------------------------------------


@router.post("/login", response=TokenOut, auth=None)
def login(request, data: LoginIn):
    """Connexion organisateur : retourne un couple de tokens JWT."""
    user = authenticate(request, username=data.username, password=data.password)
    if user is None or not user.is_active:
        raise HttpError(401, "Identifiant ou mot de passe incorrect.")
    return TokenOut(
        access=create_access_token(user.id),
        refresh=create_refresh_token(user.id),
    )


@router.post("/refresh", response=AccessOut, auth=None)
def refresh(request, data: RefreshIn):
    """Renouvelle le token d'accès à partir d'un token de rafraîchissement."""
    user = get_user_from_token(data.refresh, REFRESH)
    if user is None:
        raise HttpError(401, "Token de rafraîchissement invalide ou expiré.")
    return AccessOut(access=create_access_token(user.id))


@router.post("/logout", response=MessageOut, auth=JWTAuth())
def logout(request):
    """Déconnexion : avec des JWT sans état, le client supprime ses tokens.

    L'endpoint sert de point d'extension (journalisation / future
    liste de révocation) et confirme la déconnexion.
    """
    return MessageOut(detail="Déconnexion réussie.")


@router.get("/me", response=UserOut, auth=JWTAuth())
def me(request):
    """Retourne les informations de l'organisateur connecté."""
    user = request.auth
    return UserOut(id=str(user.id), username=user.username, email=user.email)
