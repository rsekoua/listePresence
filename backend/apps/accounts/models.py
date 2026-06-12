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


class AuditLog(models.Model):
    """Journal d'audit : trace les actions clés des utilisateurs."""

    class Action(models.TextChoices):
        LOGIN = "login", "Connexion"
        LOGIN_FAILED = "login_failed", "Échec de connexion"
        LOGOUT = "logout", "Déconnexion"
        PASSWORD_CHANGE = "password_change", "Changement de mot de passe"
        ACTIVITE_CREATE = "activite_create", "Création d'activité"
        ACTIVITE_UPDATE = "activite_update", "Modification d'activité"
        ACTIVITE_STATUT = "activite_statut", "Changement de statut"
        ACTIVITE_DELETE = "activite_delete", "Suppression d'activité"
        ACTIVITE_CLONE = "activite_clone", "Clonage d'activité"
        PARTICIPANT_CREATE = "participant_create", "Ajout manuel d'un participant"
        PARTICIPANT_UPDATE = "participant_update", "Modification d'un participant"
        EXPORT = "export", "Export"
        USER_CREATE = "user_create", "Création de compte"
        USER_UPDATE = "user_update", "Modification de compte"
        USER_DELETE = "user_delete", "Suppression de compte"
        USER_RESET_PWD = "user_reset_pwd", "Réinitialisation de mot de passe"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        verbose_name="utilisateur",
    )
    username = models.CharField("nom d'utilisateur", max_length=150, blank=True)
    action = models.CharField("action", max_length=30, choices=Action.choices)
    objet = models.CharField("objet", max_length=255, blank=True)
    ip_address = models.GenericIPAddressField("adresse IP", null=True, blank=True)
    created_at = models.DateTimeField("date", auto_now_add=True)

    class Meta:
        verbose_name = "entrée d'audit"
        verbose_name_plural = "journal d'audit"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.username} — {self.get_action_display()} — {self.created_at:%d/%m/%Y %H:%M}"
