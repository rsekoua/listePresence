"""Point d'entrée de l'API Django Ninja.

Les routeurs de chaque app seront enregistrés ici au fur et à mesure
des sprints (auth, activités, participants, public, exports).
"""

from ninja import NinjaAPI

from apps.accounts.api import router as auth_router
from apps.activites.api import router as activites_router
from apps.exports.api import router as exports_router
from apps.justificatifs.api import global_router as justifs_global_router
from apps.justificatifs.api import router as justificatifs_router
from apps.participants.api import router as public_router

api = NinjaAPI(
    title="API Gestion de Présence",
    version="1.0.0",
    description="API du système web de gestion de présence aux activités (MVP).",
)

api.add_router("/auth", auth_router)
api.add_router("/activites", activites_router)
api.add_router("/activites", justificatifs_router)
api.add_router("/justifs", justifs_global_router)
api.add_router("/public", public_router)
api.add_router("/exports", exports_router)


@api.get("/health", tags=["système"], auth=None)
def health(request):
    """Vérification simple de disponibilité de l'API."""
    return {"status": "ok"}
