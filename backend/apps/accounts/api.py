"""Endpoints d'authentification (AUTH-01 / AUTH-02) et gestion des comptes
(AUTH-04, réservé à l'administrateur)."""

from datetime import datetime
from uuid import UUID

from django.contrib.auth import authenticate
from django.db.models import Count
from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError

from .auth import (
    JWTAuth,
    REFRESH,
    create_access_token,
    create_refresh_token,
    get_user_from_token,
)
from .models import User

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
    role: str


class MessageOut(Schema):
    detail: str


class ChangePasswordIn(Schema):
    ancien_mot_de_passe: str
    nouveau_mot_de_passe: str


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
    return UserOut(
        id=str(user.id),
        username=user.username,
        email=user.email,
        role=user.role,
    )


@router.post("/change-password", response={200: MessageOut}, auth=JWTAuth())
def change_password(request, data: ChangePasswordIn):
    """Change le mot de passe de l'organisateur connecté."""
    user = request.auth
    if not user.check_password(data.ancien_mot_de_passe):
        raise HttpError(400, "Le mot de passe actuel est incorrect.")
    if len(data.nouveau_mot_de_passe) < 8:
        raise HttpError(422, "Le nouveau mot de passe doit faire au moins 8 caractères.")
    user.set_password(data.nouveau_mot_de_passe)
    user.save(update_fields=["password"])
    return 200, MessageOut(detail="Mot de passe mis à jour.")


# --- Gestion des utilisateurs (réservé à l'admin — AUTH-04) ----------------


class UserListOut(Schema):
    id: UUID
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    nb_activites: int = 0


class UserCreateIn(Schema):
    username: str
    email: str
    password: str
    role: str = "organisateur"


class UserUpdateIn(Schema):
    username: str | None = None
    email: str | None = None
    is_active: bool | None = None
    role: str | None = None


class AdminResetPwdIn(Schema):
    nouveau_mot_de_passe: str


def _require_admin(request):
    if not request.auth.is_admin:
        raise HttpError(403, "Action réservée aux administrateurs.")


def _with_nb(user: User) -> User:
    user.nb_activites = user.activites.count()
    return user


@router.get("/users", response=list[UserListOut], auth=JWTAuth())
def list_users(request):
    """Liste tous les comptes (admin uniquement)."""
    _require_admin(request)
    return (
        User.objects.annotate(nb_activites=Count("activites"))
        .order_by("-created_at")
    )


@router.post("/users", response={201: UserListOut}, auth=JWTAuth())
def create_user(request, data: UserCreateIn):
    """Crée un compte organisateur ou admin (admin uniquement)."""
    _require_admin(request)
    if data.role not in User.Role.values:
        raise HttpError(422, "Rôle invalide.")
    if len(data.password) < 8:
        raise HttpError(422, "Le mot de passe doit faire au moins 8 caractères.")
    if User.objects.filter(username__iexact=data.username).exists():
        raise HttpError(409, "Ce nom d'utilisateur est déjà pris.")
    if User.objects.filter(email__iexact=data.email).exists():
        raise HttpError(409, "Cette adresse email est déjà utilisée.")
    user = User.objects.create_user(
        username=data.username.strip(),
        email=data.email.strip().lower(),
        password=data.password,
        role=data.role,
    )
    return 201, _with_nb(user)


@router.patch("/users/{user_id}", response=UserListOut, auth=JWTAuth())
def update_user(request, user_id: UUID, data: UserUpdateIn):
    """Modifie un compte (nom, email, rôle, activation) — admin uniquement."""
    _require_admin(request)
    user = get_object_or_404(User, id=user_id)
    is_self = user.id == request.auth.id

    if data.username is not None:
        username = data.username.strip()
        if not username:
            raise HttpError(422, "Le nom d'utilisateur est requis.")
        if User.objects.filter(username__iexact=username).exclude(id=user.id).exists():
            raise HttpError(409, "Ce nom d'utilisateur est déjà pris.")
        user.username = username
    if data.email is not None:
        email = data.email.strip().lower()
        if not email:
            raise HttpError(422, "L'email est requis.")
        if User.objects.filter(email__iexact=email).exclude(id=user.id).exists():
            raise HttpError(409, "Cette adresse email est déjà utilisée.")
        user.email = email
    if data.role is not None:
        if data.role not in User.Role.values:
            raise HttpError(422, "Rôle invalide.")
        if is_self and data.role != User.Role.ADMIN:
            raise HttpError(400, "Vous ne pouvez pas retirer votre propre rôle admin.")
        user.role = data.role
    if data.is_active is not None:
        if is_self and data.is_active is False:
            raise HttpError(400, "Vous ne pouvez pas désactiver votre propre compte.")
        user.is_active = data.is_active
    user.save()
    return _with_nb(user)


@router.post("/users/{user_id}/reset-password", response={200: MessageOut}, auth=JWTAuth())
def reset_user_password(request, user_id: UUID, data: AdminResetPwdIn):
    """Réinitialise le mot de passe d'un utilisateur (admin uniquement)."""
    _require_admin(request)
    if len(data.nouveau_mot_de_passe) < 8:
        raise HttpError(422, "Le mot de passe doit faire au moins 8 caractères.")
    user = get_object_or_404(User, id=user_id)
    user.set_password(data.nouveau_mot_de_passe)
    user.save(update_fields=["password"])
    return 200, MessageOut(detail="Mot de passe réinitialisé.")


@router.delete("/users/{user_id}", response={200: MessageOut}, auth=JWTAuth())
def delete_user(request, user_id: UUID):
    """Supprime un compte (admin uniquement).

    Refusé pour son propre compte, ou si l'utilisateur a créé des activités
    (le désactiver à la place pour ne pas perdre les données liées).
    """
    _require_admin(request)
    user = get_object_or_404(User, id=user_id)
    if user.id == request.auth.id:
        raise HttpError(400, "Vous ne pouvez pas supprimer votre propre compte.")
    if user.activites.exists():
        raise HttpError(
            409,
            "Ce compte a créé des activités : désactivez-le plutôt que de le "
            "supprimer (la suppression effacerait ses activités).",
        )
    user.delete()
    return 200, MessageOut(detail="Compte supprimé.")
