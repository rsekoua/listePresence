import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Organisateur de l'application.

    Étend l'utilisateur Django standard avec un identifiant UUID et un
    email unique, conformément au modèle de données du cahier des charges.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField("adresse email", unique=True)
    created_at = models.DateTimeField("date de création", auto_now_add=True)

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.username
