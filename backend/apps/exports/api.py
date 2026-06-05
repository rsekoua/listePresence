"""Endpoints d'export de documents (Sprint 5 — EXP-01 à EXP-05).

Toutes les routes sont protégées par JWT. Les exports de liste (Excel, PDF
liste de présence, ZIP) acceptent les mêmes filtres que la liste des
participants : recherche plein texte, structure, plage de dates et complétude
des CNI (EXP-05).
"""

from datetime import date, datetime
from uuid import UUID

from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Query, Router, Schema
from ninja.errors import HttpError

from apps.accounts.audit import record
from apps.accounts.auth import JWTAuth
from apps.accounts.models import AuditLog
from apps.activites.models import Activite
from apps.participants.models import Participant

from . import services
from .models import ExportLog

router = Router(tags=["exports"], auth=JWTAuth())

_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _filtrer(activite_id: UUID, search, structure, date_from, date_to, cni):
    """Applique les filtres EXP-05 et renvoie le queryset ordonné."""
    qs = Participant.objects.filter(activite_id=activite_id)
    if search:
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
    if cni == "complete":
        qs = qs.exclude(photo_cni_recto="").exclude(photo_cni_verso="")
    elif cni == "incomplete":
        qs = qs.filter(Q(photo_cni_recto="") | Q(photo_cni_verso=""))
    return qs.order_by("nom", "prenom")


def _attachment(content: bytes, filename: str, content_type: str) -> HttpResponse:
    response = HttpResponse(content, content_type=content_type)
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _slug(activite: Activite) -> str:
    return services._safe(activite.nom)


def _log_export(request, activite, type_export: str, nb_entrees: int) -> None:
    """Trace un export dans le journal (EXP-06) + le journal d'audit."""
    ExportLog.objects.create(
        activite=activite,
        type=type_export,
        nb_entrees=nb_entrees,
        created_by=request.auth,
    )
    record(
        request,
        AuditLog.Action.EXPORT,
        objet=f"{ExportLog.Type(type_export).label} — {activite.nom}",
    )


def _get_activite_visible(user, activite_id: UUID) -> Activite:
    """Activité visible par l'utilisateur (admin : toutes ; organisateur : les
    siennes), sinon 404."""
    activite = get_object_or_404(
        Activite.objects.select_related("created_by"), id=activite_id
    )
    if not (user.is_admin or activite.created_by_id == user.id):
        raise HttpError(404, "Activité introuvable.")
    return activite


@router.get("/activites/{activite_id}/excel")
def export_excel(
    request,
    activite_id: UUID,
    search: str | None = Query(None),
    structure: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    cni: str | None = Query(None),
):
    """EXP-01 — Liste des participants au format .xlsx."""
    activite = _get_activite_visible(request.auth, activite_id)
    participants = list(_filtrer(activite_id, search, structure, date_from, date_to, cni))
    content = services.build_participants_xlsx(activite, participants)
    _log_export(request, activite, ExportLog.Type.EXCEL, len(participants))
    jour = timezone.localdate().strftime("%Y%m%d")
    return _attachment(content, f"{_slug(activite)}_{jour}_participants.xlsx", _XLSX)


@router.get("/activites/{activite_id}/pdf-liste")
def export_presence_pdf(
    request,
    activite_id: UUID,
    search: str | None = Query(None),
    structure: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    cni: str | None = Query(None),
):
    """EXP-03 — Liste de présence à signer (PDF A4)."""
    activite = _get_activite_visible(request.auth, activite_id)
    participants = list(_filtrer(activite_id, search, structure, date_from, date_to, cni))
    content = services.build_presence_list_pdf(activite, participants)
    _log_export(request, activite, ExportLog.Type.PDF_LISTE, len(participants))
    jour = timezone.localdate().strftime("%Y%m%d")
    return _attachment(
        content, f"{_slug(activite)}_{jour}_liste_presence.pdf", "application/pdf"
    )


@router.get("/activites/{activite_id}/zip")
def export_cni_zip(
    request,
    activite_id: UUID,
    search: str | None = Query(None),
    structure: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    cni: str | None = Query(None),
):
    """EXP-04 — Archive ZIP des fiches PDF CNI."""
    activite = _get_activite_visible(request.auth, activite_id)
    participants = list(_filtrer(activite_id, search, structure, date_from, date_to, cni))
    content = services.build_cni_zip(activite, participants)
    _log_export(request, activite, ExportLog.Type.ZIP, len(participants))
    jour = timezone.localdate().strftime("%Y%m%d")
    return _attachment(
        content, f"{_slug(activite)}_{jour}_fiches_cni.zip", "application/zip"
    )


@router.get("/activites/{activite_id}/qrcode-pdf")
def export_qrcode_pdf(request, activite_id: UUID):
    """Affiche PDF du QR Code (infos activité + QR Code)."""
    activite = _get_activite_visible(request.auth, activite_id)
    content = services.build_activite_qr_pdf(activite)
    _log_export(request, activite, ExportLog.Type.QRCODE, 0)
    return _attachment(
        content, f"{_slug(activite)}_qrcode.pdf", "application/pdf"
    )


@router.get("/participants/{participant_id}/pdf")
def export_participant_pdf(request, participant_id: UUID):
    """EXP-02 — Fiche CNI individuelle (PDF)."""
    participant = get_object_or_404(
        Participant.objects.select_related("activite", "activite__created_by"),
        id=participant_id,
    )
    user = request.auth
    if not (user.is_admin or participant.activite.created_by_id == user.id):
        raise HttpError(404, "Participant introuvable.")
    content = services.build_participant_cni_pdf(participant.activite, participant)
    _log_export(request, participant.activite, ExportLog.Type.FICHE_CNI, 1)
    return _attachment(
        content,
        f"{services._safe(participant.nom)}_{services._safe(participant.prenom)}_cni.pdf",
        "application/pdf",
    )


class ExportLogOut(Schema):
    type: str
    type_label: str
    nb_entrees: int
    created_at: datetime
    utilisateur: str | None

    @staticmethod
    def resolve_type_label(obj: ExportLog) -> str:
        return obj.get_type_display()

    @staticmethod
    def resolve_utilisateur(obj: ExportLog) -> str | None:
        return obj.created_by.username if obj.created_by else None


@router.get("/activites/{activite_id}/historique", response=list[ExportLogOut])
def export_history(request, activite_id: UUID):
    """EXP-06 — Journal des exports générés pour une activité."""
    activite = _get_activite_visible(request.auth, activite_id)
    return activite.exports.select_related("created_by").all()
