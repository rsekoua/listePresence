"""
URL configuration for config project.

https://docs.djangoproject.com/en/6.0/topics/http/urls/
"""

import re

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse, HttpResponseNotFound
from django.urls import path, re_path

from config.api import api

urlpatterns = [
    path("api/", api.urls),
]

# L'admin Django est monté sur un chemin configurable (settings.ADMIN_URL) et
# peut être totalement retiré (DJANGO_ADMIN_URL="") sur un déploiement où il
# n'est pas nécessaire : c'est la surface d'attaque la plus exposée du projet
# (formulaire de connexion par session, sans la limitation de débit qui protège
# /api/auth/login).
if settings.ADMIN_URL:
    urlpatterns.insert(0, path(settings.ADMIN_URL, admin.site.urls))

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


# Attrape-tout en dernier : tout ce qui n'est pas /api ni l'admin → SPA React.
_reserved = "api/" + (f"|{re.escape(settings.ADMIN_URL)}" if settings.ADMIN_URL else "")
urlpatterns += [re_path(rf"^(?!{_reserved}).*$", spa)]
