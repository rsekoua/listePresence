"""Endpoints de gestion des activités (ACT-01 à ACT-07).

Toutes les routes sont protégées par JWT. Règles RBAC :
- Visibilité : tous les comptes (admin et organisateurs) voient toutes les
  activités.
- Modification (mise à jour, suppression, statut) : réservée au créateur de
  l'activité ou à un administrateur. Vérifiée côté serveur.
- Clonage : autorisé à tous ; la copie appartient à celui qui clone.
"""

from __future__ import annotations

import io
from datetime import datetime
from uuid import UUID

import qrcode
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError

from apps.accounts.auth import JWTAuth

from .models import Activite

router = Router(tags=["activités"], auth=JWTAuth())


# --- Schémas ---------------------------------------------------------------


class ActiviteIn(Schema):
    nom: str
    description: str = ""
    date_debut: datetime
    date_fin: datetime
    lieu: str


class ActiviteUpdate(Schema):
    nom: str | None = None
    description: str | None = None
    date_debut: datetime | None = None
    date_fin: datetime | None = None
    lieu: str | None = None
    statut: str | None = None


class CreatedByOut(Schema):
    id: UUID
    username: str


class ActiviteOut(Schema):
    id: UUID
    nom: str
    description: str
    date_debut: datetime
    date_fin: datetime
    lieu: str
    token_qr: UUID
    statut: str
    form_url: str
    created_by: CreatedByOut
    can_edit: bool
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_form_url(obj: Activite) -> str:
        return f"{settings.PUBLIC_FORM_BASE_URL}/form/{obj.token_qr}"


class MessageOut(Schema):
    detail: str


# --- Helpers ---------------------------------------------------------------


def _can_edit(user, activite: Activite) -> bool:
    """Un admin peut tout modifier ; un organisateur, seulement ses activités."""
    return user.is_admin or activite.created_by_id == user.id


def _with_perm(user, activite: Activite) -> Activite:
    """Annote l'activité avec can_edit pour la sérialisation."""
    activite.can_edit = _can_edit(user, activite)
    return activite


def _get_activite(activite_id: UUID) -> Activite:
    """Récupère une activité (visible par tous) ou 404."""
    return get_object_or_404(
        Activite.objects.select_related("created_by"), id=activite_id
    )


def _require_edit(user, activite: Activite) -> None:
    if not _can_edit(user, activite):
        raise HttpError(403, "Vous ne pouvez modifier que vos propres activités.")


def _validate_dates(date_debut, date_fin):
    if date_debut and date_fin and date_fin <= date_debut:
        raise HttpError(422, "La date de fin doit être postérieure à la date de début.")


# --- Endpoints CRUD --------------------------------------------------------


@router.get("/", response=list[ActiviteOut])
def list_activites(request):
    """Liste toutes les activités (visibilité globale)."""
    user = request.auth
    activites = Activite.objects.select_related("created_by").all()
    return [_with_perm(user, a) for a in activites]


@router.post("/", response={201: ActiviteOut})
def create_activite(request, data: ActiviteIn):
    """Crée une activité (token QR généré automatiquement)."""
    _validate_dates(data.date_debut, data.date_fin)
    activite = Activite.objects.create(created_by=request.auth, **data.dict())
    return 201, _with_perm(request.auth, activite)


@router.get("/{activite_id}", response=ActiviteOut)
def get_activite(request, activite_id: UUID):
    """Détail d'une activité (visible par tous)."""
    return _with_perm(request.auth, _get_activite(activite_id))


@router.put("/{activite_id}", response=ActiviteOut)
def update_activite(request, activite_id: UUID, data: ActiviteUpdate):
    """Modifie une activité (créateur ou admin ; token QR inchangé — ACT-04)."""
    activite = _get_activite(activite_id)
    _require_edit(request.auth, activite)
    payload = data.dict(exclude_unset=True)

    if "statut" in payload and payload["statut"] not in Activite.Statut.values:
        raise HttpError(422, "Statut invalide.")

    new_debut = payload.get("date_debut", activite.date_debut)
    new_fin = payload.get("date_fin", activite.date_fin)
    _validate_dates(new_debut, new_fin)

    for field, value in payload.items():
        setattr(activite, field, value)
    activite.save()
    return _with_perm(request.auth, activite)


@router.delete("/{activite_id}", response={200: MessageOut})
def delete_activite(request, activite_id: UUID):
    """Supprime une activité (créateur ou admin — ACT-06).

    Note : le contrôle « uniquement si aucun participant » sera ajouté au
    Sprint 3, une fois le modèle Participant disponible.
    """
    activite = _get_activite(activite_id)
    _require_edit(request.auth, activite)
    activite.delete()
    return 200, MessageOut(detail="Activité supprimée.")


@router.post("/{activite_id}/clone", response={201: ActiviteOut})
def clone_activite(request, activite_id: UUID):
    """Clone une activité visible. La copie appartient à l'utilisateur courant."""
    source = _get_activite(activite_id)
    copie = Activite.objects.create(
        nom=f"{source.nom} (copie)",
        description=source.description,
        date_debut=source.date_debut,
        date_fin=source.date_fin,
        lieu=source.lieu,
        statut=Activite.Statut.OUVERT,
        created_by=request.auth,
    )
    return 201, _with_perm(request.auth, copie)


@router.get("/{activite_id}/qrcode", auth=JWTAuth())
def get_qrcode(request, activite_id: UUID):
    """Génère le QR Code PNG encodant l'URL du formulaire public (ACT-02)."""
    activite = _get_activite(activite_id)
    url = f"{settings.PUBLIC_FORM_BASE_URL}/form/{activite.token_qr}"

    img = qrcode.make(url)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    response = HttpResponse(buffer.getvalue(), content_type="image/png")
    response["Content-Disposition"] = f'inline; filename="qrcode_{activite.id}.png"'
    return response
