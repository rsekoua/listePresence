import uuid

from django.conf import settings
from django.db import models


class ExportLog(models.Model):
    """Journal des exports générés (EXP-06) : date, type, nombre d'entrées,
    utilisateur ayant déclenché l'export."""

    class Type(models.TextChoices):
        EXCEL = "excel", "Liste Excel"
        PDF_LISTE = "pdf_liste", "Liste de présence (PDF)"
        ZIP = "zip", "Fiches CNI (ZIP)"
        QRCODE = "qrcode", "Affiche QR Code (PDF)"
        FICHE_CNI = "fiche_cni", "Fiche CNI individuelle (PDF)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activite = models.ForeignKey(
        "activites.Activite",
        on_delete=models.CASCADE,
        related_name="exports",
        verbose_name="activité",
    )
    type = models.CharField("type d'export", max_length=20, choices=Type.choices)
    nb_entrees = models.PositiveIntegerField("nombre d'entrées", default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="exports_declenches",
        verbose_name="déclenché par",
    )
    created_at = models.DateTimeField("date", auto_now_add=True)

    class Meta:
        verbose_name = "export"
        verbose_name_plural = "exports"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.get_type_display()} — {self.created_at:%d/%m/%Y %H:%M}"
