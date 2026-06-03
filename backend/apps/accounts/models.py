import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Compte de l'application (administrateur ou organisateur).

    Étend l'utilisateur Django standard avec un identifiant UUID, un email
    unique et un rôle (RBAC).
    """

    class Role(models.TextChoices):
        ADMIN = "admin", "Administrateur"
        ORGANISATEUR = "organisateur", "Organisateur"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField("adresse email", unique=True)
    role = models.CharField(
        "rôle",
        max_length=20,
        choices=Role.choices,
        default=Role.ORGANISATEUR,
    )
    created_at = models.DateTimeField("date de création", auto_now_add=True)

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.username

    @property
    def is_admin(self) -> bool:
        return self.role == self.Role.ADMIN
