import uuid

from django.db import models
from django.utils import timezone


def cni_upload_path(instance: "Participant", filename: str) -> str:
    """Arborescence structurée : cni/{annee}/{activite_id}/{participant_id}/<fichier>.

    `filename` est fourni explicitement ('recto.jpg' / 'verso.jpg') au moment
    de l'enregistrement (cf. IMG-03).
    """
    year = timezone.now().year
    return f"cni/{year}/{instance.activite_id}/{instance.id}/{filename}"


class Participant(models.Model):
    """Participant enregistré à une activité (formulaire public)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activite = models.ForeignKey(
        "activites.Activite",
        on_delete=models.CASCADE,
        related_name="participants",
        verbose_name="activité",
    )
    nom = models.CharField("nom", max_length=100)
    prenom = models.CharField("prénom", max_length=100)
    structure = models.CharField("structure", max_length=255)
    fonction = models.CharField("fonction", max_length=255)
    telephone_wave = models.CharField("téléphone Wave", max_length=20)
    email = models.EmailField("email")
    numero_cni = models.CharField("numéro CNI", max_length=50)
    photo_cni_recto = models.ImageField("photo CNI recto", upload_to=cni_upload_path)
    photo_cni_verso = models.ImageField("photo CNI verso", upload_to=cni_upload_path)
    horodatage = models.DateTimeField("horodatage", auto_now_add=True)
    ip_address = models.GenericIPAddressField("adresse IP", null=True, blank=True)

    class Meta:
        verbose_name = "participant"
        verbose_name_plural = "participants"
        ordering = ["-horodatage"]
        constraints = [
            models.UniqueConstraint(
                fields=["activite", "numero_cni"],
                name="unique_cni_par_activite",
            )
        ]

    def __str__(self) -> str:
        return f"{self.prenom} {self.nom}"
