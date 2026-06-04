"""Services de génération des documents de sortie (Sprint 5).

Chaque fonction renvoie les octets du fichier généré (bytes), prêts à être
servis dans une réponse HTTP. Aucune écriture sur disque.

  - build_participants_xlsx   → EXP-01 (Excel)
  - build_participant_cni_pdf → EXP-02 (PDF fiche CNI individuelle)
  - build_presence_list_pdf   → EXP-03 (PDF liste de présence à signer)
  - build_cni_zip             → EXP-04 (ZIP des fiches CNI)
"""

import io
import zipfile

from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Palette alignée sur le thème de l'interface (cyan).
_CYAN = "0891B2"
_CYAN_DARK = "0E7490"
_ZEBRA = "F0F9FB"
_INK = "0F172A"


def _fmt(dt) -> str:
    """Formate une date en heure locale, tolérant les valeurs nulles."""
    if not dt:
        return ""
    return timezone.localtime(dt).strftime("%d/%m/%Y %H:%M")


def _safe(name: str) -> str:
    """Normalise une chaîne pour un nom de fichier (pas de caractères spéciaux)."""
    keep = "".join(c if c.isalnum() or c in " -_" else "_" for c in name)
    return "_".join(keep.split()).strip("_") or "export"


# --- EXP-01 : Export Excel -------------------------------------------------


def build_participants_xlsx(activite, participants) -> bytes:
    """Classeur .xlsx : onglet récapitulatif + liste formatée des participants."""
    wb = Workbook()

    header_fill = PatternFill("solid", fgColor=_CYAN)
    header_font = Font(bold=True, color="FFFFFF", size=11)
    title_font = Font(bold=True, color=_INK, size=14)
    label_font = Font(bold=True, color=_INK)
    center = Alignment(horizontal="center", vertical="center")
    left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    thin = Side(style="thin", color="D5DEE6")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    # Onglet 1 — Récapitulatif
    recap = wb.active
    recap.title = "Récapitulatif"
    recap["A1"] = activite.nom
    recap["A1"].font = title_font
    recap.merge_cells("A1:B1")

    complets = sum(1 for p in participants if p.photo_cni_recto and p.photo_cni_verso)
    lignes = [
        ("Lieu", activite.lieu),
        ("Période", f"{_fmt(activite.date_debut)} → {_fmt(activite.date_fin)}"),
        ("Statut", activite.get_statut_display()),
        ("Organisateur", activite.created_by.username),
        ("Nombre de participants", len(participants)),
        ("CNI complètes", complets),
        ("CNI incomplètes", len(participants) - complets),
        ("Document généré le", _fmt(timezone.now())),
    ]
    for i, (label, value) in enumerate(lignes, start=3):
        recap[f"A{i}"] = label
        recap[f"A{i}"].font = label_font
        recap[f"B{i}"] = value
    recap.column_dimensions["A"].width = 26
    recap.column_dimensions["B"].width = 48

    # Onglet 2 — Participants
    ws = wb.create_sheet("Participants")
    colonnes = [
        "N°",
        "Nom",
        "Prénom",
        "Structure",
        "Fonction",
        "Téléphone Wave",
        "Email",
        "N° CNI",
        "Horodatage",
    ]
    # Suivi de la longueur max par colonne pour l'auto-dimensionnement.
    max_len = [len(titre) for titre in colonnes]

    for col, titre in enumerate(colonnes, start=1):
        cell = ws.cell(row=1, column=col, value=titre)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center
        cell.border = border

    for idx, p in enumerate(participants, start=1):
        row = idx + 1
        valeurs = [
            idx,
            p.nom,
            p.prenom,
            p.structure,
            p.fonction,
            p.telephone_wave,
            p.email,
            p.numero_cni,
            _fmt(p.horodatage),
        ]
        for col, value in enumerate(valeurs, start=1):
            cell = ws.cell(row=row, column=col, value=value)
            cell.border = border
            cell.alignment = center if col in (1, 6, 8, 9) else left
            if idx % 2 == 0:
                cell.fill = PatternFill("solid", fgColor=_ZEBRA)
            max_len[col - 1] = max(max_len[col - 1], len(str(value)))

    # Auto-dimensionnement : largeur = contenu le plus long + marge, bornée.
    for col, longueur in enumerate(max_len, start=1):
        ws.column_dimensions[get_column_letter(col)].width = min(max(longueur + 3, 8), 50)

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(colonnes))}{len(participants) + 1}"

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


# --- EXP-02 : PDF fiche CNI individuelle -----------------------------------


def build_participant_cni_pdf(activite, participant) -> bytes:
    """Fiche PDF d'une page : infos + photos recto/verso positionnées."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # En-tête
    c.setFillColor(colors.HexColor(f"#{_CYAN_DARK}"))
    c.rect(0, height - 28 * mm, width, 28 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(18 * mm, height - 14 * mm, activite.nom[:70])
    c.setFont("Helvetica", 10)
    c.drawString(
        18 * mm,
        height - 21 * mm,
        f"{activite.lieu}  ·  {_fmt(activite.date_debut)} → {_fmt(activite.date_fin)}",
    )

    # Bloc informations participant
    y = height - 40 * mm
    c.setFillColor(colors.HexColor(f"#{_INK}"))
    c.setFont("Helvetica-Bold", 13)
    c.drawString(18 * mm, y, f"{participant.prenom} {participant.nom}")
    y -= 9 * mm

    infos = [
        ("Structure", participant.structure),
        ("Fonction", participant.fonction),
        ("Téléphone Wave", participant.telephone_wave),
        ("Email", participant.email),
        ("N° CNI", participant.numero_cni),
        ("Enregistré le", _fmt(participant.horodatage)),
    ]
    c.setFont("Helvetica", 11)
    for label, value in infos:
        c.setFillColor(colors.HexColor("#475569"))
        c.drawString(18 * mm, y, f"{label} :")
        c.setFillColor(colors.HexColor(f"#{_INK}"))
        c.drawString(58 * mm, y, str(value))
        y -= 7 * mm

    # Photos CNI (ratio carte ~85.6 x 54 mm)
    img_w, img_h = 85 * mm, 54 * mm
    x = 18 * mm
    y_imgs = 70 * mm
    for cote, field in (
        ("Recto", participant.photo_cni_recto),
        ("Verso", participant.photo_cni_verso),
    ):
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor("#475569"))
        c.drawString(x, y_imgs + img_h + 3 * mm, f"CNI — {cote}")
        c.setStrokeColor(colors.HexColor("#CBD5E1"))
        c.rect(x, y_imgs, img_w, img_h, fill=0, stroke=1)
        if field:
            try:
                c.drawImage(
                    field.path,
                    x,
                    y_imgs,
                    width=img_w,
                    height=img_h,
                    preserveAspectRatio=True,
                    anchor="c",
                )
            except Exception:
                _placeholder(c, x, y_imgs, img_w, img_h, "Image illisible")
        else:
            _placeholder(c, x, y_imgs, img_w, img_h, "Photo non fournie")
        x += img_w + 8 * mm

    # Pied de page
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.drawString(18 * mm, 12 * mm, f"Fiche générée le {_fmt(timezone.now())}")
    c.drawRightString(width - 18 * mm, 12 * mm, "Page 1 / 1")

    c.showPage()
    c.save()
    return buffer.getvalue()


def _placeholder(c, x, y, w, h, text: str) -> None:
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.setFont("Helvetica-Oblique", 9)
    c.drawCentredString(x + w / 2, y + h / 2, text)
    c.setFillColor(colors.HexColor(f"#{_INK}"))


# --- EXP-03 : PDF liste de présence à signer -------------------------------


def build_presence_list_pdf(activite, participants) -> bytes:
    """Liste de présence A4 paysage avec une colonne Signature vide."""
    page = landscape(A4)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=page,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Liste de présence — {activite.nom}",
    )
    styles = getSampleStyleSheet()
    titre = styles["Title"]
    titre.fontSize = 16
    sous = styles["Normal"]
    sous.fontSize = 9
    cell = styles["Normal"].clone("cell")
    cell.fontSize = 8

    elements = [
        Paragraph(f"Liste de présence — {activite.nom}", titre),
        Paragraph(
            f"{activite.lieu} &nbsp;·&nbsp; "
            f"{_fmt(activite.date_debut)} → {_fmt(activite.date_fin)}",
            sous,
        ),
        Spacer(1, 8 * mm),
    ]

    entetes = [
        "N°",
        "Nom",
        "Prénom",
        "Structure",
        "Fonction",
        "Téléphone",
        "Signature",
    ]
    data = [entetes]
    for i, p in enumerate(participants, start=1):
        data.append(
            [
                str(i),
                Paragraph(p.nom, cell),
                Paragraph(p.prenom, cell),
                Paragraph(p.structure, cell),
                Paragraph(p.fonction, cell),
                p.telephone_wave,
                "",
            ]
        )
    if not participants:
        data.append(["—", "Aucun participant", "", "", "", "", ""])

    # Largeurs étalées sur la largeur paysage (~267 mm utiles).
    table = Table(
        data,
        colWidths=[
            12 * mm,
            38 * mm,
            34 * mm,
            50 * mm,
            42 * mm,
            34 * mm,
            57 * mm,
        ],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(f"#{_CYAN}")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("ALIGN", (5, 0), (5, -1), "CENTER"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(f"#{_ZEBRA}")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 1), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
            ]
        )
    )
    elements.append(table)

    def _footer(c, _doc):
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#94A3B8"))
        c.drawString(15 * mm, 10 * mm, f"Généré le {_fmt(timezone.now())}")
        c.drawRightString(page[0] - 15 * mm, 10 * mm, f"Page {c.getPageNumber()}")

    doc.build(elements, onFirstPage=_footer, onLaterPages=_footer)
    return buffer.getvalue()


# --- EXP-04 : ZIP des fiches CNI -------------------------------------------


def build_cni_zip(activite, participants) -> bytes:
    """Archive ZIP regroupant les fiches PDF CNI de chaque participant."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        used: set[str] = set()
        for p in participants:
            base = f"{_safe(p.nom)}_{_safe(p.prenom)}_cni"
            name = f"{base}.pdf"
            n = 2
            while name in used:
                name = f"{base}_{n}.pdf"
                n += 1
            used.add(name)
            zf.writestr(name, build_participant_cni_pdf(activite, p))
    return buffer.getvalue()
