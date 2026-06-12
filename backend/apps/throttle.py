"""Limitation de débit simple (anti-bruteforce / anti-spam).

Compteur à fenêtre fixe stocké dans le cache Django — volontairement minimaliste,
sans dépendance externe. Deux usages :

- `hit()`     : compte chaque appel (ex. formulaire public, anti-spam).
- `guard()` + `register()` + `reset()` : ne pénalise que les échecs et remet
  le compteur à zéro en cas de succès (ex. connexion : on ne bloque pas un
  utilisateur qui se connecte correctement).

⚠️ En production multi-processus (plusieurs workers Gunicorn), configurer un
cache partagé (Redis ou base de données) afin que le compteur soit commun à
tous les workers ; le cache par défaut (mémoire locale) est propre à chaque
processus.
"""

from __future__ import annotations

from django.core.cache import cache
from ninja.errors import HttpError

from apps.accounts.audit import client_ip


def _key(scope: str, ident: str) -> str:
    return f"throttle:{scope}:{ident}"


def _incr(key: str, window: int) -> None:
    """Incrémente le compteur, en initialisant le TTL au premier appel."""
    if not cache.add(key, 1, timeout=window):
        try:
            cache.incr(key)
        except ValueError:
            # La clé a expiré entre le add et le incr : on repart à 1.
            cache.set(key, 1, timeout=window)


def guard(request, scope: str, limit: int, ident: str | None = None) -> str:
    """Lève 429 si la limite est déjà atteinte (sans incrémenter).

    Renvoie l'identifiant utilisé (IP par défaut) pour un `register`/`reset`
    ultérieur, évitant de recalculer l'IP.
    """
    ident = ident or client_ip(request) or "anon"
    if cache.get(_key(scope, ident), 0) >= limit:
        raise HttpError(429, "Trop de tentatives. Réessayez dans quelques minutes.")
    return ident


def register(request, scope: str, window: int, ident: str | None = None) -> None:
    """Comptabilise une tentative (typiquement un échec)."""
    ident = ident or client_ip(request) or "anon"
    _incr(_key(scope, ident), window)


def reset(request, scope: str, ident: str | None = None) -> None:
    """Remet le compteur à zéro (typiquement après un succès)."""
    ident = ident or client_ip(request) or "anon"
    cache.delete(_key(scope, ident))


def hit(request, scope: str, limit: int, window: int, ident: str | None = None) -> None:
    """Compte l'appel et lève 429 si la limite par fenêtre est dépassée."""
    ident = ident or client_ip(request) or "anon"
    key = _key(scope, ident)
    if cache.get(key, 0) >= limit:
        raise HttpError(
            429, "Trop de requêtes. Patientez quelques instants avant de réessayer."
        )
    _incr(key, window)
