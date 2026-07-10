import uuid

from django.conf import settings
from django.db import models


class Activite(models.Model):
    """Activité organisée (formation, atelier, réunion, séminaire).

    Conforme au modèle de données du cahier des charges (entité Activité).
    """

    class Statut(models.TextChoices):
        OUVERT = "ouvert", "Ouverte"
        FERME = "ferme", "Fermée"
        ARCHIVE = "archive", "Archivée"

    class TypeMission(models.TextChoices):
        ATELIER = "atelier", "Atelier (en salle)"
        TERRAIN = "terrain", "Mission terrain"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom = models.CharField("nom", max_length=255)
    description = models.TextField("description", blank=True, default="")
    date_debut = models.DateTimeField("date de début")
    date_fin = models.DateTimeField("date de fin")
    ville = models.CharField("ville", max_length=255, default="")
    lieu = models.CharField("lieu", max_length=255)
    token_qr = models.UUIDField(
        "token QR Code", default=uuid.uuid4, unique=True, editable=False
    )
    statut = models.CharField(
        "statut", max_length=10, choices=Statut.choices, default=Statut.OUVERT
    )
    type_mission = models.CharField(
        "type de mission",
        max_length=10,
        choices=TypeMission.choices,
        default=TypeMission.ATELIER,
    )
    budget_alloue = models.DecimalField(
        "budget alloué",
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=(
            "Montant total remis pour une mission terrain, base du taux de "
            "conciliation (montants justifiés ÷ budget alloué)."
        ),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activites",
        verbose_name="organisateur",
    )
    created_at = models.DateTimeField("date de création", auto_now_add=True)
    updated_at = models.DateTimeField("dernière modification", auto_now=True)

    class Meta:
        verbose_name = "activité"
        verbose_name_plural = "activités"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.nom
