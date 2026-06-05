"""Helpers du journal d'audit."""

from .models import AuditLog


def client_ip(request) -> str | None:
    """Adresse IP de l'appelant (gère un éventuel reverse proxy)."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def record(request, action: str, objet: str = "", user=None, username=None) -> None:
    """Enregistre une entrée d'audit.

    `user` par défaut = l'utilisateur authentifié (`request.auth`). On stocke
    aussi un instantané du nom d'utilisateur (`username`), utile si le compte
    est supprimé ou pour les échecs de connexion (aucun utilisateur associé).
    """
    if user is None:
        user = getattr(request, "auth", None)
    try:
        AuditLog.objects.create(
            user=user if getattr(user, "pk", None) else None,
            username=username or getattr(user, "username", "") or "",
            action=action,
            objet=objet[:255],
            ip_address=client_ip(request),
        )
    except Exception:
        # L'audit ne doit jamais casser l'action métier.
        pass
