"""Point d'entrée WSGI pour Phusion Passenger (o2switch).

L'Application Root est la racine du dépôt ; le code Django vit dans backend/.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
