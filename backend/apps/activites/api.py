"""Endpoints de gestion des activités (ACT-01 à ACT-07).

Toutes les routes sont protégées par JWT. Règles RBAC :
- Visibilité : tous les comptes (admin et organisateurs) voient toutes les
  activités.
- Modification (mise à jour, suppression, statut) : réservée au créateur de
  l'activité ou à un administrateur. Vérifiée côté serveur.
- Clonage : autorisé à tous ; la copie appartient à celui qui clone.
"""

import io
import re
from datetime import date, datetime
from uuid import UUID

import qrcode
from django.conf import settings
from django.db.models import Count
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from ninja import File, Form, Query, Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile
from ninja.pagination import paginate
from pydantic import field_validator

from apps.accounts.audit import record
from apps.accounts.auth import JWTAuth
from apps.accounts.models import AuditLog
from apps.participants.models import Participant

from .models import Activite

router = Router(tags=["activités"], auth=JWTAuth())


# --- Schémas ---------------------------------------------------------------


class ActiviteIn(Schema):
    nom: str
    description: str = ""
    date_debut: datetime
    date_fin: datetime
    ville: str
    lieu: str


class ActiviteUpdate(Schema):
    nom: str | None = None
    description: str | None = None
    date_debut: datetime | None = None
    date_fin: datetime | None = None
    ville: str | None = None
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
    ville: str
    lieu: str
    token_qr: UUID
    statut: str
    form_url: str
    created_by: CreatedByOut
    can_edit: bool
    nb_participants: int
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_form_url(obj: Activite) -> str:
        return f"{settings.PUBLIC_FORM_BASE_URL}/form/{obj.token_qr}"


class MessageOut(Schema):
    detail: str


# --- Helpers ---------------------------------------------------------------


def _can_view(user, activite: Activite) -> bool:
    """Un admin voit tout ; un organisateur, seulement ses propres activités."""
    return user.is_admin or activite.created_by_id == user.id


def _can_edit(user, activite: Activite) -> bool:
    """Droits de modification (RBAC) :

    - admin : tous les droits, y compris sur une activité fermée/archivée ;
    - organisateur : seulement ses propres activités, et uniquement tant
      qu'elles sont OUVERTES (une fois fermées, elles sont verrouillées).
    """
    if user.is_admin:
        return True
    return (
        activite.created_by_id == user.id
        and activite.statut == Activite.Statut.OUVERT
    )


def _with_perm(user, activite: Activite) -> Activite:
    """Annote l'activité avec can_edit + nb_participants pour la sérialisation."""
    activite.can_edit = _can_edit(user, activite)
    if not hasattr(activite, "nb_participants"):
        activite.nb_participants = activite.participants.count()
    return activite


def _get_activite(user, activite_id: UUID) -> Activite:
    """Récupère une activité visible par l'utilisateur, ou 404.

    Renvoie 404 (et non 403) pour un organisateur qui tente d'accéder à une
    activité d'autrui, afin de ne pas révéler son existence.
    """
    activite = get_object_or_404(
        Activite.objects.select_related("created_by"), id=activite_id
    )
    if not _can_view(user, activite):
        raise HttpError(404, "Activité introuvable.")
    return activite


def _require_edit(user, activite: Activite) -> None:
    if not _can_edit(user, activite):
        if not user.is_admin and activite.created_by_id == user.id:
            raise HttpError(
                403, "Cette activité est fermée : elle ne peut plus être modifiée."
            )
        raise HttpError(403, "Vous ne pouvez modifier que vos propres activités.")


def _validate_dates(date_debut, date_fin):
    if date_debut and date_fin and date_fin <= date_debut:
        raise HttpError(422, "La date de fin doit être postérieure à la date de début.")


# --- Endpoints CRUD --------------------------------------------------------


@router.get("/", response=list[ActiviteOut])
def list_activites(request):
    """Liste les activités : toutes pour un admin, seulement les siennes
    pour un organisateur (AUTH-04)."""
    user = request.auth
    activites = Activite.objects.select_related("created_by").annotate(
        nb_participants=Count("participants")
    )
    if not user.is_admin:
        activites = activites.filter(created_by=user)
    return [_with_perm(user, a) for a in activites]


class GlobalStatsOut(Schema):
    nb_activites: int
    nb_participants_uniques: int


@router.get("/stats-globales", response=GlobalStatsOut)
def stats_globales(request):
    """Statistiques transverses du tableau de bord (DASH-01).

    `nb_participants_uniques` compte les personnes distinctes par numéro de CNI,
    sans double comptage entre activités.
    """
    return GlobalStatsOut(
        nb_activites=Activite.objects.count(),
        nb_participants_uniques=(
            Participant.objects.values("numero_cni").distinct().count()
        ),
    )


# --- Annuaire des personnes (dédupliqué par numéro de CNI) ------------------


class PersonneOut(Schema):
    numero_cni: str
    nom: str
    prenom: str
    structure: str
    fonction: str
    telephone_wave: str
    email: str
    nb_activites: int
    derniere_participation: datetime
    cni_complete: bool


@router.get("/personnes", response=list[PersonneOut])
def list_personnes(
    request,
    search: str | None = Query(None),
    structure: str | None = Query(None),
    cni: str | None = Query(None),
):
    """Annuaire des personnes distinctes (regroupées par numéro de CNI).

    L'identité affichée provient de l'inscription la plus récente de chaque
    personne ; `nb_activites` compte ses activités distinctes.
    """
    from django.db.models import Q

    base = Participant.objects.all()
    # Un organisateur ne voit que les participants de ses propres activités.
    if not request.auth.is_admin:
        base = base.filter(activite__created_by=request.auth)
    if search:
        base = base.filter(
            Q(nom__icontains=search)
            | Q(prenom__icontains=search)
            | Q(email__icontains=search)
            | Q(numero_cni__icontains=search)
        )
    if structure:
        base = base.filter(structure__icontains=structure)

    personnes: dict[str, dict] = {}
    # Tri décroissant : la première occurrence rencontrée est la plus récente.
    for p in base.order_by("-horodatage"):
        info = personnes.get(p.numero_cni)
        if info is None:
            personnes[p.numero_cni] = {
                "rep": p,
                "activites": {p.activite_id},
                "derniere": p.horodatage,
            }
        else:
            info["activites"].add(p.activite_id)

    resultats = []
    for numero, info in personnes.items():
        rep = info["rep"]
        complete = bool(rep.photo_cni_recto) and bool(rep.photo_cni_verso)
        if cni == "complete" and not complete:
            continue
        if cni == "incomplete" and complete:
            continue
        resultats.append(
            PersonneOut(
                numero_cni=numero,
                nom=rep.nom,
                prenom=rep.prenom,
                structure=rep.structure,
                fonction=rep.fonction,
                telephone_wave=rep.telephone_wave,
                email=rep.email,
                nb_activites=len(info["activites"]),
                derniere_participation=info["derniere"],
                cni_complete=complete,
            )
        )
    resultats.sort(key=lambda r: r.derniere_participation, reverse=True)
    return resultats


class HistoriqueLigneOut(Schema):
    participant_id: UUID
    activite_id: UUID
    activite_nom: str
    activite_lieu: str
    horodatage: datetime
    cni_complete: bool


class HistoriqueOut(Schema):
    numero_cni: str
    nom: str
    prenom: str
    structure: str
    fonction: str
    telephone_wave: str
    email: str
    nb_activites: int
    participations: list[HistoriqueLigneOut]


@router.get("/personnes/historique", response=HistoriqueOut)
def historique_personne(request, numero_cni: str = Query(...)):
    """Historique de participation d'une personne (toutes ses inscriptions).

    Un organisateur ne voit que les participations à ses propres activités.
    """
    qs = Participant.objects.select_related("activite").filter(numero_cni=numero_cni)
    if not request.auth.is_admin:
        qs = qs.filter(activite__created_by=request.auth)
    parts = list(qs.order_by("-horodatage"))
    if not parts:
        raise HttpError(404, "Aucune personne avec ce numéro de CNI.")

    rep = parts[0]  # le plus récent
    participations = [
        HistoriqueLigneOut(
            participant_id=p.id,
            activite_id=p.activite_id,
            activite_nom=p.activite.nom,
            activite_lieu=p.activite.lieu,
            horodatage=p.horodatage,
            cni_complete=bool(p.photo_cni_recto) and bool(p.photo_cni_verso),
        )
        for p in parts
    ]
    return HistoriqueOut(
        numero_cni=rep.numero_cni,
        nom=rep.nom,
        prenom=rep.prenom,
        structure=rep.structure,
        fonction=rep.fonction,
        telephone_wave=rep.telephone_wave,
        email=rep.email,
        nb_activites=len({p.activite_id for p in parts}),
        participations=participations,
    )


@router.post("/", response={201: ActiviteOut})
def create_activite(request, data: ActiviteIn):
    """Crée une activité (token QR généré automatiquement)."""
    _validate_dates(data.date_debut, data.date_fin)
    activite = Activite.objects.create(created_by=request.auth, **data.dict())
    record(request, AuditLog.Action.ACTIVITE_CREATE, objet=activite.nom)
    return 201, _with_perm(request.auth, activite)


@router.get("/{activite_id}", response=ActiviteOut)
def get_activite(request, activite_id: UUID):
    """Détail d'une activité (visible par tous)."""
    return _with_perm(request.auth, _get_activite(request.auth, activite_id))


@router.put("/{activite_id}", response=ActiviteOut)
def update_activite(request, activite_id: UUID, data: ActiviteUpdate):
    """Modifie une activité (créateur ou admin ; token QR inchangé — ACT-04)."""
    activite = _get_activite(request.auth, activite_id)
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
    record(request, AuditLog.Action.ACTIVITE_UPDATE, objet=activite.nom)
    return _with_perm(request.auth, activite)


@router.delete("/{activite_id}", response={200: MessageOut})
def delete_activite(request, activite_id: UUID):
    """Supprime une activité (créateur ou admin — ACT-06).

    Refusé si l'activité contient des participants (elle ne peut qu'être
    archivée dans ce cas).
    """
    activite = _get_activite(request.auth, activite_id)
    _require_edit(request.auth, activite)
    if activite.participants.exists():
        raise HttpError(
            409,
            "Cette activité contient des participants : elle ne peut pas être "
            "supprimée (archivez-la à la place).",
        )
    nom = activite.nom
    activite.delete()
    record(request, AuditLog.Action.ACTIVITE_DELETE, objet=nom)
    return 200, MessageOut(detail="Activité supprimée.")


@router.post("/{activite_id}/clone", response={201: ActiviteOut})
def clone_activite(request, activite_id: UUID):
    """Clone une activité visible. La copie appartient à l'utilisateur courant."""
    source = _get_activite(request.auth, activite_id)
    copie = Activite.objects.create(
        nom=f"{source.nom} (copie)",
        description=source.description,
        date_debut=source.date_debut,
        date_fin=source.date_fin,
        ville=source.ville,
        lieu=source.lieu,
        statut=Activite.Statut.OUVERT,
        created_by=request.auth,
    )
    record(request, AuditLog.Action.ACTIVITE_CLONE, objet=copie.nom)
    return 201, _with_perm(request.auth, copie)


@router.get("/{activite_id}/qrcode", auth=JWTAuth())
def get_qrcode(request, activite_id: UUID):
    """Génère le QR Code PNG encodant l'URL du formulaire public (ACT-02)."""
    activite = _get_activite(request.auth, activite_id)
    url = f"{settings.PUBLIC_FORM_BASE_URL}/form/{activite.token_qr}"

    img = qrcode.make(url)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    response = HttpResponse(buffer.getvalue(), content_type="image/png")
    response["Content-Disposition"] = f'inline; filename="qrcode_{activite.id}.png"'
    return response


# --- Statut (ouverture / fermeture) ---------------------------------------


class StatutIn(Schema):
    statut: str


@router.patch("/{activite_id}/statut", response=ActiviteOut)
def set_statut(request, activite_id: UUID, data: StatutIn):
    """Ouvre / ferme / archive la collecte (créateur ou admin — ACT-05)."""
    activite = _get_activite(request.auth, activite_id)
    _require_edit(request.auth, activite)
    if data.statut not in Activite.Statut.values:
        raise HttpError(422, "Statut invalide.")
    activite.statut = data.statut
    activite.save(update_fields=["statut", "updated_at"])
    record(
        request,
        AuditLog.Action.ACTIVITE_STATUT,
        objet=f"{activite.nom} → {activite.get_statut_display()}",
    )
    return _with_perm(request.auth, activite)


# --- Participants (côté organisateur) -------------------------------------


class ParticipantListOut(Schema):
    id: UUID
    nom: str
    prenom: str
    structure: str
    fonction: str
    telephone_wave: str
    email: str
    numero_cni: str
    horodatage: datetime
    photo_recto_url: str
    photo_verso_url: str
    cni_complete: bool

    @staticmethod
    def resolve_photo_recto_url(obj: Participant) -> str:
        return f"/api/activites/{obj.activite_id}/participants/{obj.id}/photo/recto"

    @staticmethod
    def resolve_photo_verso_url(obj: Participant) -> str:
        return f"/api/activites/{obj.activite_id}/participants/{obj.id}/photo/verso"

    @staticmethod
    def resolve_cni_complete(obj: Participant) -> bool:
        return bool(obj.photo_cni_recto) and bool(obj.photo_cni_verso)


class StructureStat(Schema):
    structure: str
    count: int


class StatsOut(Schema):
    total: int
    cni_completes: int
    cni_incompletes: int
    par_structure: list[StructureStat]


class ParticipantManualIn(Schema):
    """Ajout manuel d'un participant par un organisateur (photos CNI facultatives)."""

    nom: str
    prenom: str
    structure: str
    fonction: str
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


@router.get("/{activite_id}/participants", response=list[ParticipantListOut])
@paginate
def list_participants(
    request,
    activite_id: UUID,
    search: str | None = Query(None),
    structure: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
):
    """Liste paginée et filtrée des participants d'une activité (DASH-03)."""
    _get_activite(request.auth, activite_id)  # 404 si l'activité n'existe pas
    qs = Participant.objects.filter(activite_id=activite_id)
    if search:
        from django.db.models import Q

        qs = qs.filter(
            Q(nom__icontains=search)
            | Q(prenom__icontains=search)
            | Q(email__icontains=search)
            | Q(numero_cni__icontains=search)
        )
    if structure:
        qs = qs.filter(structure__icontains=structure)
    if date_from:
        qs = qs.filter(horodatage__date__gte=date_from)
    if date_to:
        qs = qs.filter(horodatage__date__lte=date_to)
    return qs


@router.post("/{activite_id}/participants", response={201: ParticipantListOut, 409: MessageOut})
def add_participant(
    request,
    activite_id: UUID,
    payload: ParticipantManualIn = Form(...),
    photo_cni_recto: UploadedFile | None = File(None),
    photo_cni_verso: UploadedFile | None = File(None),
):
    """Ajout manuel d'un participant (créateur ou admin).

    Les photos CNI sont facultatives : l'organisateur peut saisir un
    participant sans pièce, ou joindre le recto et/ou le verso s'il les
    possède (mêmes traitement et validation que le formulaire public).
    """
    from django.core.files.base import ContentFile

    from apps.participants.api import _process_cni_image

    activite = _get_activite(request.auth, activite_id)
    _require_edit(request.auth, activite)
    if activite.statut != Activite.Statut.OUVERT:
        raise HttpError(403, "La collecte est fermée : impossible d'ajouter un participant.")
    if Participant.objects.filter(
        activite=activite, numero_cni=payload.numero_cni
    ).exists():
        return 409, MessageOut(
            detail="Un participant avec ce numéro de CNI est déjà enregistré "
            "pour cette activité."
        )
    participant = Participant(
        activite=activite,
        nom=payload.nom.strip(),
        prenom=payload.prenom.strip(),
        structure=payload.structure.strip(),
        fonction=payload.fonction.strip(),
        telephone_wave=payload.telephone_wave,
        email=payload.email,
        numero_cni=payload.numero_cni,
    )
    if photo_cni_recto is not None:
        recto_bytes = _process_cni_image(photo_cni_recto)
        participant.photo_cni_recto.save("recto.jpg", ContentFile(recto_bytes), save=False)
    if photo_cni_verso is not None:
        verso_bytes = _process_cni_image(photo_cni_verso)
        participant.photo_cni_verso.save("verso.jpg", ContentFile(verso_bytes), save=False)
    participant.save()
    return 201, participant


@router.get("/{activite_id}/stats", response=StatsOut)
def participants_stats(request, activite_id: UUID):
    """Statistiques d'une activité (DASH-05)."""
    _get_activite(request.auth, activite_id)
    qs = Participant.objects.filter(activite_id=activite_id)
    total = qs.count()
    par_structure = [
        StructureStat(structure=row["structure"] or "—", count=row["n"])
        for row in qs.values("structure")
        .annotate(n=Count("id"))
        .order_by("-n")[:10]
    ]
    completes = qs.exclude(photo_cni_recto="").exclude(photo_cni_verso="").count()
    return StatsOut(
        total=total,
        cni_completes=completes,
        cni_incompletes=total - completes,
        par_structure=par_structure,
    )


@router.get("/{activite_id}/participants/{participant_id}", response=ParticipantListOut)
def get_participant(request, activite_id: UUID, participant_id: UUID):
    """Fiche détaillée d'un participant (DASH-04)."""
    _get_activite(request.auth, activite_id)  # 404 si non visible
    return get_object_or_404(
        Participant, id=participant_id, activite_id=activite_id
    )


@router.get("/{activite_id}/participants/{participant_id}/photo/{cote}")
def participant_photo(request, activite_id: UUID, participant_id: UUID, cote: str):
    """Sert une photo CNI (accès protégé par JWT — IMG-03)."""
    _get_activite(request.auth, activite_id)  # 404 si non visible
    participant = get_object_or_404(
        Participant, id=participant_id, activite_id=activite_id
    )
    field = (
        participant.photo_cni_recto
        if cote == "recto"
        else participant.photo_cni_verso
    )
    if not field:
        raise HttpError(404, "Photo introuvable.")
    return FileResponse(field.open("rb"), content_type="image/jpeg")
