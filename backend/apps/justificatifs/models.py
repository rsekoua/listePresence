import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


def piece_upload_path(instance: "PieceJointe", filename: str) -> str:
    """Arborescence : justificatifs/{annee}/{activite_id}/{justificatif_id}/<fichier>.

    Le nom de fichier d'origine est conservé (préfixé de l'id de la pièce pour
    éviter toute collision), afin de garder l'extension (.pdf/.jpg/.png).
    """
    year = timezone.now().year
    activite_id = instance.justificatif.activite_id
    return (
        f"justificatifs/{year}/{activite_id}/"
        f"{instance.justificatif_id}/{instance.id}_{filename}"
    )


class Justificatif(models.Model):
    """Poste de dépense d'une mission terrain, appuyé par des pièces jointes.

    Deux logiques de saisie selon la catégorie :

    - carburant / péage / communication : plusieurs reçus, chacun portant son
      propre montant (cf. ``PieceJointe.montant``). Le montant justifié du poste
      est la somme des reçus.
    - perdiem / présence / collation : une pièce scannée unique (liste
      d'émargement, feuille de présence). Le montant est saisi globalement dans
      ``montant_total`` (présence : sans montant).

    ``collation`` référence l'activité (``activite_collation``) dont les CNI ont
    été collectées, pour permettre le téléchargement des pièces des bénéficiaires.
    """

    class Categorie(models.TextChoices):
        CARBURANT = "carburant", "Carburant"
        PEAGE = "peage", "Péage"
        COMMUNICATION = "communication", "Communication"
        PERDIEM = "perdiem", "Perdiem"
        PRESENCE = "presence", "Liste de présence"
        COLLATION = "collation", "Collation"

    # Catégories dont le montant justifié = somme des montants des reçus.
    MULTI_RECU = {Categorie.CARBURANT, Categorie.PEAGE, Categorie.COMMUNICATION}

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activite = models.ForeignKey(
        "activites.Activite",
        on_delete=models.CASCADE,
        related_name="justificatifs",
        verbose_name="mission",
    )
    equipe = models.CharField("équipe", max_length=255, blank=True, default="")
    categorie = models.CharField(
        "catégorie", max_length=20, choices=Categorie.choices
    )
    montant_total = models.DecimalField(
        "montant total",
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=(
            "Saisi pour perdiem / collation. Pour carburant, péage et "
            "communication, il est calculé comme la somme des reçus."
        ),
    )
    activite_collation = models.ForeignKey(
        "activites.Activite",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="justificatifs_collation",
        verbose_name="activité liée (collation)",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="justificatifs",
        verbose_name="créé par",
    )
    created_at = models.DateTimeField("date de création", auto_now_add=True)

    class Meta:
        verbose_name = "justificatif"
        verbose_name_plural = "justificatifs"
        ordering = ["categorie", "-created_at"]

    def __str__(self) -> str:
        return f"{self.get_categorie_display()} — {self.activite_id}"

    @property
    def montant_justifie(self) -> Decimal:
        """Montant justifié du poste.

        Somme des reçus pour les catégories multi-reçus ; ``montant_total``
        (ou 0) sinon.
        """
        if self.categorie in self.MULTI_RECU:
            total = sum(
                (p.montant or Decimal("0")) for p in self.pieces.all()
            )
            return Decimal(total)
        return self.montant_total or Decimal("0")


class PieceJointe(models.Model):
    """Fichier justificatif (reçu, feuille scannée) — PDF ou image."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    justificatif = models.ForeignKey(
        Justificatif,
        on_delete=models.CASCADE,
        related_name="pieces",
        verbose_name="justificatif",
    )
    fichier = models.FileField(
        "fichier", upload_to=piece_upload_path, max_length=255
    )
    montant = models.DecimalField(
        "montant",
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Montant du reçu (carburant, péage, communication).",
    )
    libelle = models.CharField("libellé", max_length=255, blank=True, default="")
    content_type = models.CharField("type MIME", max_length=100, blank=True, default="")
    created_at = models.DateTimeField("date d'ajout", auto_now_add=True)

    class Meta:
        verbose_name = "pièce jointe"
        verbose_name_plural = "pièces jointes"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return self.libelle or self.fichier.name
