"""Endpoints de gestion des activités (ACT-01 à ACT-07).

Toutes les routes sont protégées par JWT et cloisonnées : un organisateur
ne voit et ne gère que ses propres activités.
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
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_form_url(obj: Activite) -> str:
        return f"{settings.PUBLIC_FORM_BASE_URL}/form/{obj.token_qr}"


class MessageOut(Schema):
    detail: str


# --- Helpers ---------------------------------------------------------------


def _get_owned(request, activite_id: UUID) -> Activite:
    """Récupère une activité appartenant à l'organisateur connecté (404 sinon)."""
    return get_object_or_404(Activite, id=activite_id, created_by=request.auth)


def _validate_dates(date_debut, date_fin):
    if date_debut and date_fin and date_fin <= date_debut:
        raise HttpError(422, "La date de fin doit être postérieure à la date de début.")


# --- Endpoints CRUD --------------------------------------------------------


@router.get("/", response=list[ActiviteOut])
def list_activites(request):
    """Liste les activités de l'organisateur connecté."""
    return Activite.objects.filter(created_by=request.auth)


@router.post("/", response={201: ActiviteOut})
def create_activite(request, data: ActiviteIn):
    """Crée une activité (token QR généré automatiquement)."""
    _validate_dates(data.date_debut, data.date_fin)
    activite = Activite.objects.create(created_by=request.auth, **data.dict())
    return 201, activite


@router.get("/{activite_id}", response=ActiviteOut)
def get_activite(request, activite_id: UUID):
    """Détail d'une activité."""
    return _get_owned(request, activite_id)


@router.put("/{activite_id}", response=ActiviteOut)
def update_activite(request, activite_id: UUID, data: ActiviteUpdate):
    """Modifie une activité (le token QR reste inchangé — ACT-04)."""
    activite = _get_owned(request, activite_id)
    payload = data.dict(exclude_unset=True)

    if "statut" in payload and payload["statut"] not in Activite.Statut.values:
        raise HttpError(422, "Statut invalide.")

    new_debut = payload.get("date_debut", activite.date_debut)
    new_fin = payload.get("date_fin", activite.date_fin)
    _validate_dates(new_debut, new_fin)

    for field, value in payload.items():
        setattr(activite, field, value)
    activite.save()
    return activite


@router.delete("/{activite_id}", response={200: MessageOut})
def delete_activite(request, activite_id: UUID):
    """Supprime une activité (ACT-06).

    Note : le contrôle « uniquement si aucun participant » sera ajouté au
    Sprint 3, une fois le modèle Participant disponible.
    """
    activite = _get_owned(request, activite_id)
    activite.delete()
    return 200, MessageOut(detail="Activité supprimée.")


@router.get("/{activite_id}/qrcode", auth=JWTAuth())
def get_qrcode(request, activite_id: UUID):
    """Génère le QR Code PNG encodant l'URL du formulaire public (ACT-02)."""
    activite = _get_owned(request, activite_id)
    url = f"{settings.PUBLIC_FORM_BASE_URL}/form/{activite.token_qr}"

    img = qrcode.make(url)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    response = HttpResponse(buffer.getvalue(), content_type="image/png")
    response["Content-Disposition"] = f'inline; filename="qrcode_{activite.id}.png"'
    return response
