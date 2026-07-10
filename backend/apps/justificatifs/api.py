"""Endpoints des justificatifs de dépenses d'une mission terrain.

Modèle de collecte (cf. conception) :

- On crée un poste (``Justificatif``) rattaché à la mission, avec une catégorie
  et, en option, une étiquette d'équipe.
- On y ajoute des pièces (``PieceJointe``) : un reçu (carburant/péage/comm.) porte
  son propre montant ; une feuille scannée (perdiem/présence) est unique.
- Le taux de conciliation de la mission = Σ montants justifiés ÷ budget alloué.

Toutes les routes sont protégées par JWT et réservées aux missions terrain, avec
les mêmes règles RBAC que les activités (créateur ou admin pour modifier).
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from uuid import UUID

from django.db.models import Prefetch
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from ninja import File, Form, Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile

from apps.accounts.audit import record
from apps.accounts.auth import JWTAuth
from apps.accounts.models import AuditLog
from apps.activites.api import _get_activite, _require_edit
from apps.activites.models import Activite

from .models import Justificatif, PieceJointe

router = Router(tags=["justificatifs"], auth=JWTAuth())

# Garde-fous d'upload — un reçu scanné reste bien en-deçà.
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 Mo
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}


# --- Schémas ---------------------------------------------------------------


class PieceOut(Schema):
    id: UUID
    libelle: str
    montant: Decimal | None
    content_type: str
    fichier_url: str
    created_at: str

    @staticmethod
    def resolve_fichier_url(obj: PieceJointe) -> str:
        return (
            f"/api/activites/{obj.justificatif.activite_id}"
            f"/justificatifs/{obj.justificatif_id}/pieces/{obj.id}/fichier"
        )

    @staticmethod
    def resolve_created_at(obj: PieceJointe) -> str:
        return obj.created_at.isoformat()


class JustificatifOut(Schema):
    id: UUID
    equipe: str
    categorie: str
    categorie_label: str
    montant_total: Decimal | None
    montant_justifie: Decimal
    activite_collation_id: UUID | None
    activite_collation_nom: str | None
    pieces: list[PieceOut]
    created_at: str

    @staticmethod
    def resolve_categorie_label(obj: Justificatif) -> str:
        return obj.get_categorie_display()

    @staticmethod
    def resolve_activite_collation_nom(obj: Justificatif) -> str | None:
        return obj.activite_collation.nom if obj.activite_collation_id else None

    @staticmethod
    def resolve_created_at(obj: Justificatif) -> str:
        return obj.created_at.isoformat()


class JustificatifIn(Schema):
    categorie: str
    equipe: str = ""
    montant_total: Decimal | None = None
    activite_collation_id: UUID | None = None


class CategorieConciliation(Schema):
    categorie: str
    categorie_label: str
    montant_justifie: Decimal


class ConciliationOut(Schema):
    budget_alloue: Decimal | None
    montant_justifie: Decimal
    reste_a_justifier: Decimal | None
    taux: float | None  # pourcentage 0–100, None si pas de budget saisi
    par_categorie: list[CategorieConciliation]


class MessageOut(Schema):
    detail: str


# --- Helpers ---------------------------------------------------------------


def _require_terrain(activite: Activite) -> None:
    if activite.type_mission != Activite.TypeMission.TERRAIN:
        raise HttpError(
            400,
            "Les justificatifs de dépenses ne concernent que les missions terrain.",
        )


def _get_justificatif(activite: Activite, justificatif_id: UUID) -> Justificatif:
    return get_object_or_404(
        Justificatif.objects.prefetch_related("pieces").select_related(
            "activite_collation"
        ),
        id=justificatif_id,
        activite=activite,
    )


def _validate_upload(uploaded: UploadedFile) -> None:
    """Vérifie taille, extension et signature (PDF ou image) d'une pièce."""
    if uploaded.size and uploaded.size > MAX_UPLOAD_BYTES:
        raise HttpError(422, "Fichier trop volumineux (maximum 15 Mo).")
    name = (uploaded.name or "").lower()
    ext = name[name.rfind(".") :] if "." in name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HttpError(
            422, "Format non accepté : joignez un PDF ou une image (JPG, PNG)."
        )
    head = uploaded.read(8)
    uploaded.seek(0)
    is_pdf = head[:5] == b"%PDF-"
    is_jpg = head[:3] == b"\xff\xd8\xff"
    is_png = head[:8] == b"\x89PNG\r\n\x1a\n"
    is_webp = head[:4] == b"RIFF"
    # HEIC/HEIF : conteneur ISO-BMFF, marqueur 'ftyp' en octets 4–8.
    is_heic = head[4:8] == b"ftyp"
    if not (is_pdf or is_jpg or is_png or is_webp or is_heic):
        raise HttpError(
            422, "Le fichier fourni n'est ni un PDF ni une image valide."
        )


def _parse_montant(value: str | None) -> Decimal | None:
    if value is None or str(value).strip() == "":
        return None
    try:
        montant = Decimal(str(value).replace(" ", "").replace(",", "."))
    except (InvalidOperation, ValueError):
        raise HttpError(422, "Montant invalide.")
    if montant < 0:
        raise HttpError(422, "Le montant ne peut pas être négatif.")
    return montant


# --- Endpoints -------------------------------------------------------------


@router.get(
    "/{activite_id}/justificatifs", response=list[JustificatifOut]
)
def list_justificatifs(request, activite_id: UUID):
    """Liste les postes de dépenses d'une mission (avec leurs pièces)."""
    activite = _get_activite(request.auth, activite_id)
    qs = (
        Justificatif.objects.filter(activite=activite)
        .select_related("activite_collation")
        .prefetch_related(Prefetch("pieces"))
    )
    return list(qs)


@router.get("/{activite_id}/conciliation", response=ConciliationOut)
def conciliation(request, activite_id: UUID):
    """Taux de conciliation de la mission (global + par catégorie)."""
    activite = _get_activite(request.auth, activite_id)
    qs = Justificatif.objects.filter(activite=activite).prefetch_related("pieces")

    par_cat: dict[str, Decimal] = {}
    total = Decimal("0")
    for j in qs:
        montant = j.montant_justifie
        total += montant
        par_cat[j.categorie] = par_cat.get(j.categorie, Decimal("0")) + montant

    budget = activite.budget_alloue
    taux: float | None = None
    reste: Decimal | None = None
    if budget and budget > 0:
        taux = float(round((total / budget) * 100, 2))
        reste = budget - total

    labels = dict(Justificatif.Categorie.choices)
    par_categorie = [
        CategorieConciliation(
            categorie=cat,
            categorie_label=labels.get(cat, cat),
            montant_justifie=montant,
        )
        for cat, montant in sorted(par_cat.items())
    ]
    return ConciliationOut(
        budget_alloue=budget,
        montant_justifie=total,
        reste_a_justifier=reste,
        taux=taux,
        par_categorie=par_categorie,
    )


@router.post(
    "/{activite_id}/justificatifs", response={201: JustificatifOut}
)
def create_justificatif(request, activite_id: UUID, data: JustificatifIn):
    """Crée un poste de dépense (les pièces sont ajoutées ensuite)."""
    activite = _get_activite(request.auth, activite_id)
    _require_edit(request.auth, activite)
    _require_terrain(activite)

    if data.categorie not in Justificatif.Categorie.values:
        raise HttpError(422, "Catégorie invalide.")

    collation = None
    if data.activite_collation_id is not None:
        if data.categorie != Justificatif.Categorie.COLLATION:
            raise HttpError(
                422,
                "Une activité liée n'est valable que pour la catégorie collation.",
            )
        collation = _get_activite(request.auth, data.activite_collation_id)

    justificatif = Justificatif.objects.create(
        activite=activite,
        equipe=data.equipe.strip(),
        categorie=data.categorie,
        montant_total=data.montant_total,
        activite_collation=collation,
        created_by=request.auth,
    )
    record(
        request,
        AuditLog.Action.JUSTIF_CREATE,
        objet=f"{justificatif.get_categorie_display()} — {activite.nom}",
    )
    return 201, _get_justificatif(activite, justificatif.id)


@router.put(
    "/{activite_id}/justificatifs/{justificatif_id}", response=JustificatifOut
)
def update_justificatif(
    request, activite_id: UUID, justificatif_id: UUID, data: JustificatifIn
):
    """Met à jour l'étiquette d'équipe, le montant total ou l'activité liée."""
    activite = _get_activite(request.auth, activite_id)
    _require_edit(request.auth, activite)
    justificatif = _get_justificatif(activite, justificatif_id)

    if data.categorie not in Justificatif.Categorie.values:
        raise HttpError(422, "Catégorie invalide.")

    collation = justificatif.activite_collation
    if data.activite_collation_id is not None:
        if data.categorie != Justificatif.Categorie.COLLATION:
            raise HttpError(
                422,
                "Une activité liée n'est valable que pour la catégorie collation.",
            )
        collation = _get_activite(request.auth, data.activite_collation_id)
    elif data.categorie != Justificatif.Categorie.COLLATION:
        collation = None

    justificatif.equipe = data.equipe.strip()
    justificatif.categorie = data.categorie
    justificatif.montant_total = data.montant_total
    justificatif.activite_collation = collation
    justificatif.save()
    record(
        request,
        AuditLog.Action.JUSTIF_UPDATE,
        objet=f"{justificatif.get_categorie_display()} — {activite.nom}",
    )
    return _get_justificatif(activite, justificatif.id)


@router.delete(
    "/{activite_id}/justificatifs/{justificatif_id}", response={200: MessageOut}
)
def delete_justificatif(request, activite_id: UUID, justificatif_id: UUID):
    """Supprime un poste et ses pièces."""
    activite = _get_activite(request.auth, activite_id)
    _require_edit(request.auth, activite)
    justificatif = _get_justificatif(activite, justificatif_id)
    label = justificatif.get_categorie_display()
    justificatif.delete()
    record(
        request,
        AuditLog.Action.JUSTIF_DELETE,
        objet=f"{label} — {activite.nom}",
    )
    return 200, MessageOut(detail="Justificatif supprimé.")


@router.post(
    "/{activite_id}/justificatifs/{justificatif_id}/pieces",
    response={201: JustificatifOut},
)
def add_piece(
    request,
    activite_id: UUID,
    justificatif_id: UUID,
    fichier: UploadedFile = File(...),
    montant: str | None = Form(None),
    libelle: str = Form(""),
):
    """Ajoute une pièce (reçu / feuille scannée) au poste — PDF ou image."""
    activite = _get_activite(request.auth, activite_id)
    _require_edit(request.auth, activite)
    justificatif = _get_justificatif(activite, justificatif_id)

    _validate_upload(fichier)
    montant_val = _parse_montant(montant)

    piece = PieceJointe(
        justificatif=justificatif,
        montant=montant_val,
        libelle=libelle.strip(),
        content_type=fichier.content_type or "",
    )
    piece.fichier.save(fichier.name, fichier, save=False)
    piece.save()
    record(
        request,
        AuditLog.Action.JUSTIF_UPDATE,
        objet=f"{justificatif.get_categorie_display()} — pièce — {activite.nom}",
    )
    return 201, _get_justificatif(activite, justificatif.id)


@router.delete(
    "/{activite_id}/justificatifs/{justificatif_id}/pieces/{piece_id}",
    response={200: MessageOut},
)
def delete_piece(
    request, activite_id: UUID, justificatif_id: UUID, piece_id: UUID
):
    """Supprime une pièce."""
    activite = _get_activite(request.auth, activite_id)
    _require_edit(request.auth, activite)
    justificatif = _get_justificatif(activite, justificatif_id)
    piece = get_object_or_404(PieceJointe, id=piece_id, justificatif=justificatif)
    piece.delete()
    record(
        request,
        AuditLog.Action.JUSTIF_UPDATE,
        objet=f"{justificatif.get_categorie_display()} — pièce supprimée — {activite.nom}",
    )
    return 200, MessageOut(detail="Pièce supprimée.")


@router.get(
    "/{activite_id}/justificatifs/{justificatif_id}/pieces/{piece_id}/fichier"
)
def get_piece_fichier(
    request, activite_id: UUID, justificatif_id: UUID, piece_id: UUID
):
    """Sert le fichier d'une pièce (accès protégé par JWT)."""
    activite = _get_activite(request.auth, activite_id)
    justificatif = _get_justificatif(activite, justificatif_id)
    piece = get_object_or_404(PieceJointe, id=piece_id, justificatif=justificatif)
    if not piece.fichier:
        raise HttpError(404, "Fichier introuvable.")
    content_type = piece.content_type or "application/octet-stream"
    return FileResponse(piece.fichier.open("rb"), content_type=content_type)


@router.get(
    "/{activite_id}/justificatifs/{justificatif_id}/cni.zip"
)
def download_collation_cni(
    request, activite_id: UUID, justificatif_id: UUID
):
    """Télécharge (ZIP) les fiches CNI des bénéficiaires d'une collation.

    Les CNI proviennent de l'activité liée (``activite_collation``), dont les
    participants ont renseigné le formulaire public.
    """
    from apps.exports.services import build_cni_zip

    activite = _get_activite(request.auth, activite_id)
    justificatif = _get_justificatif(activite, justificatif_id)
    if justificatif.categorie != Justificatif.Categorie.COLLATION:
        raise HttpError(400, "Ce justificatif n'est pas une collation.")
    if not justificatif.activite_collation_id:
        raise HttpError(400, "Aucune activité liée à cette collation.")

    source = _get_activite(request.auth, justificatif.activite_collation_id)
    participants = list(source.participants.all())
    data = build_cni_zip(source, participants)
    record(request, AuditLog.Action.EXPORT, objet=f"CNI collation — {source.nom}")
    response = HttpResponse(data, content_type="application/zip")
    response["Content-Disposition"] = 'attachment; filename="cni_collation.zip"'
    return response
