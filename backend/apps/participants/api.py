"""Endpoints publics du formulaire de collecte (Module 3 & 4).

Accessibles sans authentification, sécurisés par le token UUID opaque de
l'activité. Gèrent la vérification du token, la soumission du formulaire,
l'anti-doublon par CNI et le traitement des photos (Pillow).
"""

from __future__ import annotations

import io
import re
from datetime import datetime
from uuid import UUID

from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from ninja import File, Form, Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile
from PIL import Image, ImageOps
from pydantic import Field, field_validator

from apps.activites.models import Activite

from .models import Participant

router = Router(tags=["formulaire public"])

# Dimensions cibles des photos CNI (ratio carte 85.6 x 54 mm à 300 dpi — IMG-02)
CNI_SIZE = (1010, 638)
MIN_SIZE = (400, 250)


# --- Schémas ---------------------------------------------------------------


class ActivitePublicOut(Schema):
    nom: str
    ville: str
    lieu: str
    date_debut: datetime
    date_fin: datetime
    statut: str
    is_open: bool

    @staticmethod
    def resolve_is_open(obj: Activite) -> bool:
        return obj.statut == Activite.Statut.OUVERT


class ParticiperSchema(Schema):
    nom: str = Field(min_length=1)
    prenom: str = Field(min_length=1)
    structure: str = Field(min_length=1)
    fonction: str = Field(min_length=1)
    telephone_wave: str
    email: str
    numero_cni: str

    @field_validator("telephone_wave")
    @classmethod
    def valider_telephone(cls, v: str) -> str:
        digits = re.sub(r"[\s.\-()]", "", v)
        m = re.match(r"^(?:\+?225)?(\d{10})$", digits)
        if not m:
            raise ValueError("Numéro de téléphone ivoirien invalide.")
        return "+225" + m.group(1)

    @field_validator("email")
    @classmethod
    def valider_email(cls, v: str) -> str:
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Adresse email invalide.")
        return v.strip().lower()

    @field_validator("numero_cni")
    @classmethod
    def valider_cni(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 4:
            raise ValueError("Numéro de CNI invalide.")
        return v


class ParticipantOut(Schema):
    id: UUID
    nom: str
    prenom: str
    structure: str
    fonction: str
    telephone_wave: str
    email: str
    numero_cni: str
    horodatage: datetime


class MessageOut(Schema):
    detail: str


# --- Helpers ---------------------------------------------------------------


def _process_cni_image(uploaded: UploadedFile) -> bytes:
    """Vérifie, redimensionne et réencode une photo CNI en JPEG (IMG-02/04)."""
    if not (uploaded.content_type or "").startswith("image/"):
        raise HttpError(422, "Le fichier fourni n'est pas une image.")
    try:
        Image.open(uploaded).verify()
    except Exception:
        raise HttpError(422, "Image invalide ou corrompue.")
    uploaded.seek(0)
    img = Image.open(uploaded)
    if img.width < MIN_SIZE[0] or img.height < MIN_SIZE[1]:
        raise HttpError(422, "Image trop petite (minimum 400 x 250 pixels).")
    img = img.convert("RGB")
    img = ImageOps.fit(img, CNI_SIZE, Image.LANCZOS)  # recadre sans déformer
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    return buffer.getvalue()


def _client_ip(request) -> str | None:
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


# --- Endpoints -------------------------------------------------------------


@router.get("/activite/{token}", response=ActivitePublicOut, auth=None)
def get_activite_publique(request, token: UUID):
    """Vérifie le token et retourne les infos publiques de l'activité (FORM-01)."""
    return get_object_or_404(Activite, token_qr=token)


@router.post(
    "/activite/{token}/participer",
    response={201: ParticipantOut, 409: MessageOut},
    auth=None,
)
def participer(
    request,
    token: UUID,
    payload: ParticiperSchema = Form(...),
    photo_cni_recto: UploadedFile = File(...),
    photo_cni_verso: UploadedFile = File(...),
):
    """Enregistre un participant avec ses photos CNI (FORM-02 à FORM-06)."""
    activite = get_object_or_404(Activite, token_qr=token)

    if activite.statut != Activite.Statut.OUVERT:
        raise HttpError(403, "La collecte de cette activité est fermée.")

    # Anti-doublon par numéro de CNI au sein de l'activité (FORM-06)
    if Participant.objects.filter(
        activite=activite, numero_cni=payload.numero_cni
    ).exists():
        return 409, MessageOut(
            detail="Un participant avec ce numéro de CNI est déjà enregistré "
            "pour cette activité."
        )

    recto_bytes = _process_cni_image(photo_cni_recto)
    verso_bytes = _process_cni_image(photo_cni_verso)

    participant = Participant(
        activite=activite,
        nom=payload.nom.strip(),
        prenom=payload.prenom.strip(),
        structure=payload.structure.strip(),
        fonction=payload.fonction.strip(),
        telephone_wave=payload.telephone_wave,
        email=payload.email,
        numero_cni=payload.numero_cni,
        ip_address=_client_ip(request),
    )
    participant.photo_cni_recto.save("recto.jpg", ContentFile(recto_bytes), save=False)
    participant.photo_cni_verso.save("verso.jpg", ContentFile(verso_bytes), save=False)
    participant.save()

    return 201, participant
