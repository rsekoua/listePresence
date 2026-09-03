"""Endpoints publics du formulaire de collecte (Module 3 & 4).

Accessibles sans authentification, sécurisés par le token UUID opaque de
l'activité. Gèrent la vérification du token, le pré-remplissage par numéro de
CNI, la soumission du formulaire, l'anti-doublon par CNI et le traitement des
photos (Pillow).
"""

from __future__ import annotations

import io
import re
from datetime import datetime
from uuid import UUID

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from ninja import File, Form, Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile
from PIL import Image, ImageOps
from pydantic import Field, field_validator

from apps import throttle
from apps.accounts.audit import client_ip, record
from apps.accounts.models import AuditLog
from apps.activites.models import Activite

from .models import Participant

router = Router(tags=["formulaire public"])

# Dimensions cibles des photos CNI (ratio carte 85.6 x 54 mm à 300 dpi — IMG-02)
CNI_SIZE = (1010, 638)
MIN_SIZE = (400, 250)
# Garde-fous d'upload : taille du fichier et résolution décodée (anti-bombe de
# décompression). Une photo de CNI reste bien en-deçà de ces limites.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 Mo
MAX_PIXELS = 40_000_000  # ~40 Mpx

# Filet de sécurité au niveau de Pillow lui-même : couvre aussi les formats dont
# les dimensions ne sont connues qu'en cours de décodage (le contrôle explicite
# `img.width * img.height` ci-dessous, lui, lit l'en-tête).
Image.MAX_IMAGE_PIXELS = MAX_PIXELS


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


class PersonnePrefillOut(Schema):
    nom: str
    prenom: str
    structure: str
    fonction: str
    telephone_wave: str
    email: str


# --- Helpers ---------------------------------------------------------------


def _process_cni_image(uploaded: UploadedFile) -> bytes:
    """Vérifie, redimensionne et réencode une photo CNI en JPEG (IMG-02/04).

    La validation « est-ce une image » repose sur Pillow (ouverture réelle du
    fichier) et non sur l'en-tête Content-Type fourni par le client : celui-ci
    est peu fiable (absent ou générique selon le navigateur/mobile, ou une photo
    restaurée depuis le localStorage) et provoquait de faux rejets 422.
    """
    if uploaded.size is None or uploaded.size > MAX_UPLOAD_BYTES:
        # `size is None` = taille inconnue (transfert chunké) : refusé plutôt
        # que laissé passer sans borne, un flux illimité épuiserait le disque.
        raise HttpError(422, "Image trop volumineuse ou de taille indéterminée (max 10 Mo).")
    try:
        Image.open(uploaded).verify()
    except Exception:
        raise HttpError(422, "Le fichier fourni n'est pas une image valide.")
    uploaded.seek(0)
    img = Image.open(uploaded)
    # Rejet avant tout décodage coûteux (les dimensions viennent de l'en-tête).
    if img.width * img.height > MAX_PIXELS:
        raise HttpError(422, "Image trop grande (résolution excessive).")
    if img.width < MIN_SIZE[0] or img.height < MIN_SIZE[1]:
        raise HttpError(422, "Image trop petite (minimum 400 x 250 pixels).")
    # Corrige l'orientation d'après l'EXIF (photos mobiles souvent tournées).
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    img = ImageOps.fit(img, CNI_SIZE, Image.LANCZOS)  # recadre sans déformer
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    return buffer.getvalue()


# --- Endpoints -------------------------------------------------------------


@router.get("/activite/{token}", response=ActivitePublicOut, auth=None)
def get_activite_publique(request, token: UUID):
    """Vérifie le token et retourne les infos publiques de l'activité (FORM-01)."""
    return get_object_or_404(Activite, token_qr=token)


@router.get(
    "/activite/{token}/personne/{numero_cni}",
    response={200: PersonnePrefillOut, 404: MessageOut},
    auth=None,
)
def get_personne_prefill(request, token: UUID, numero_cni: str):
    """Pré-remplissage : dernière saisie connue pour ce numéro de CNI, toutes
    activités confondues, pour éviter à un participant déjà connu de tout
    ressaisir. Ne renvoie jamais les photos (reprises à chaque activité) ni le
    numéro de CNI lui-même (déjà saisi par l'appelant).

    Limité en débit comme la soumission (anti-énumération d'un numéro à
    l'autre) ; nécessite un token d'activité ouverte valide.
    """
    # Limite dédiée, bien plus basse que la soumission : cet endpoint divulgue
    # des données personnelles à qui devine un numéro de CNI. Le compteur est
    # posé par (IP, token d'activité) pour qu'un moissonneur ne puisse pas
    # multiplier son quota en changeant d'activité.
    throttle.hit(
        request,
        "prefill",
        settings.PREFILL_RATELIMIT,
        settings.PREFILL_RATELIMIT_WINDOW,
        ident=f"{client_ip(request) or 'anon'}|{token}",
    )
    activite = get_object_or_404(Activite, token_qr=token)
    if activite.statut != Activite.Statut.OUVERT:
        raise HttpError(403, "La collecte de cette activité est fermée.")

    numero = numero_cni.strip()
    if len(numero) < 4:
        return 404, MessageOut(detail="Aucune information existante pour ce numéro.")

    participant = (
        Participant.objects.filter(numero_cni=numero).order_by("-horodatage").first()
    )
    if not participant:
        return 404, MessageOut(detail="Aucune information existante pour ce numéro.")
    # Trace la consultation : ce point d'accès public expose des données
    # personnelles, un pic dans le journal d'audit doit être détectable.
    record(
        request,
        AuditLog.Action.PREFILL_LOOKUP,
        objet=f"{activite.nom} · CNI ***{numero[-4:]}",
    )
    return 200, PersonnePrefillOut(
        nom=participant.nom,
        prenom=participant.prenom,
        structure=participant.structure,
        fonction=participant.fonction,
        telephone_wave=participant.telephone_wave,
        email=participant.email,
    )


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
    throttle.hit(
        request,
        "participer",
        settings.PUBLIC_RATELIMIT,
        settings.PUBLIC_RATELIMIT_WINDOW,
    )
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
        ip_address=client_ip(request),
    )
    participant.photo_cni_recto.save("recto.jpg", ContentFile(recto_bytes), save=False)
    participant.photo_cni_verso.save("verso.jpg", ContentFile(verso_bytes), save=False)
    try:
        # atomic() : sur IntegrityError, ne fait échouer qu'un savepoint local
        # plutôt que de casser une éventuelle transaction englobante — sans
        # quoi les .delete() de nettoyage ci-dessous échoueraient à leur tour.
        with transaction.atomic():
            participant.save()
    except IntegrityError:
        # Deux soumissions concurrentes pour le même (activite, numero_cni) ont
        # toutes deux passé le contrôle d'existence ci-dessus (fenêtre TOCTOU) ;
        # la contrainte unique en base tranche. On nettoie les photos déjà
        # écrites sur le disque par les .save(save=False) ci-dessus, sinon
        # elles restent orphelines (aucune ligne en base ne les référence).
        participant.photo_cni_recto.delete(save=False)
        participant.photo_cni_verso.delete(save=False)
        return 409, MessageOut(
            detail="Un participant avec ce numéro de CNI est déjà enregistré "
            "pour cette activité."
        )

    return 201, participant
