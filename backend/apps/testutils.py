"""Utilitaires partagés pour les tests (Sprint 6)."""

import io

from PIL import Image

from apps.accounts.auth import create_access_token


def bearer(user) -> dict:
    """En-têtes d'authentification JWT pour le client de test."""
    return {"HTTP_AUTHORIZATION": f"Bearer {create_access_token(user.id)}"}


def fake_image(size=(600, 400)) -> bytes:
    """Génère une image JPEG valide (dimensions ≥ minimum requis)."""
    buf = io.BytesIO()
    Image.new("RGB", size, (200, 200, 200)).save(buf, "JPEG")
    return buf.getvalue()
