"""
URL configuration for config project.

https://docs.djangoproject.com/en/6.0/topics/http/urls/
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse, HttpResponseNotFound
from django.urls import path, re_path

from config.api import api

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api.urls),
]

# Service des fichiers media en développement uniquement.
# En production, les photos CNI sont servies via un endpoint protégé (Sprint 4).
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


def spa(request):
    """Renvoie l'index du build React pour toute route non-API (SPA).

    WhiteNoise sert les fichiers existants (/, /assets/…) ; cette route ne gère
    que les chemins virtuels du routeur React (/dashboard, /form/:token…) afin
    qu'un rafraîchissement ne renvoie pas un 404.
    """
    index = settings.FRONTEND_DIST / "index.html"
    if index.exists():
        return FileResponse(open(index, "rb"))
    return HttpResponseNotFound("Build frontend absent.")


# Attrape-tout en dernier : tout ce qui n'est pas /api ni /admin → SPA React.
urlpatterns += [re_path(r"^(?!api/|admin/).*$", spa)]
