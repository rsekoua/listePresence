"""Point d'entrée de l'API Django Ninja.

Les routeurs de chaque app seront enregistrés ici au fur et à mesure
des sprints (auth, activités, participants, public, exports).
"""

from ninja import NinjaAPI

api = NinjaAPI(
    title="API Gestion de Présence",
    version="1.0.0",
    description="API du système web de gestion de présence aux activités (MVP).",
)


@api.get("/health", tags=["système"])
def health(request):
    """Vérification simple de disponibilité de l'API."""
    return {"status": "ok"}
