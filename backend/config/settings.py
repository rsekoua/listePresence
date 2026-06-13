"""
Django settings for config project.

Système Web de Gestion de Présence aux Activités — MVP.
Stack : Django 6 + Django Ninja + SQLite.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Chargement des variables d'environnement depuis le fichier .env
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-5bc_d=v$^1_^jkj5@21i7k_xnrchz4x85^g(31apxao-ijklyw",
)

# SECURITY WARNING: don't run with debug turned on in production!
# Défaut volontairement à False : si la variable d'environnement est oubliée
# (typiquement en production), l'application démarre en mode durci plutôt qu'en
# mode debug. Le développement active explicitement DJANGO_DEBUG=True via .env.
DEBUG = env_bool("DJANGO_DEBUG", False)

ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if h.strip()
]

# Origines de confiance pour la protection CSRF (schéma + domaine, ex.
# "https://presence.example.com"). Requis derrière HTTPS/Nginx en production.
CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",")
    if o.strip()
]


# Durcissement sécurité — appliqué uniquement hors mode DEBUG (production).
# https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/
INSECURE_SECRET_DEFAULT = (
    "django-insecure-5bc_d=v$^1_^jkj5@21i7k_xnrchz4x85^g(31apxao-ijklyw"
)

if not DEBUG:
    # Refuse de démarrer en production avec un secret par défaut.
    if SECRET_KEY == INSECURE_SECRET_DEFAULT:
        raise RuntimeError(
            "DJANGO_SECRET_KEY doit être défini (clé de dev détectée) "
            "lorsque DJANGO_DEBUG=False."
        )

    # Reconnaît l'en-tête X-Forwarded-Proto posé par Nginx (terminaison TLS).
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", True)

    # HSTS : 1 an, sous-domaines inclus (ajustable via l'environnement).
    SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_HSTS_SECONDS", str(60 * 60 * 24 * 365)))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    # Cookies transmis uniquement via HTTPS.
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # Renforcements complémentaires.
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SESSION_COOKIE_HTTPONLY = True
    X_FRAME_OPTIONS = "DENY"


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Apps du projet
    "apps.accounts",
    "apps.activites",
    "apps.participants",
    "apps.exports",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Sert les fichiers statiques (admin + build React) sans serveur web dédié.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases
#
# Par défaut : SQLite (dev). Si DB_NAME est défini (prod), bascule sur
# PostgreSQL via les variables d'environnement — aucun changement de code.
# (PostgreSQL requiert le paquet psycopg : `uv add "psycopg[binary]"`.)

if os.getenv("DB_NAME"):
    DB_ENGINE = os.getenv("DB_ENGINE", "django.db.backends.postgresql")
    _db = {
        "ENGINE": DB_ENGINE,
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER", ""),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "127.0.0.1"),
        "PORT": os.getenv("DB_PORT", "5432"),
        "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
    }
    # MySQL/MariaDB (o2switch) : utf8mb4 pour les accents et emojis.
    if "mysql" in DB_ENGINE:
        _db["OPTIONS"] = {"charset": "utf8mb4"}
    DATABASES = {"default": _db}

    # Cache partagé entre processus (rate-limiting fiable sous Passenger).
    # Nécessite `python manage.py createcachetable` au déploiement.
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.db.DatabaseCache",
            "LOCATION": "presence_cache",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
    # Hors production (dev/tests) : cache mémoire local, suffisant.


# Modèle utilisateur personnalisé (organisateur)
AUTH_USER_MODEL = "accounts.User"


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = "fr-fr"

TIME_ZONE = "Africa/Abidjan"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Build du frontend React (déploiement mono-origine) : WhiteNoise sert ces
# fichiers à la racine du site (/ , /assets/…). Une route attrape-tout (urls.py)
# renvoie index.html pour les routes SPA rafraîchies.
FRONTEND_DIST = BASE_DIR / "frontend_dist"
WHITENOISE_ROOT = FRONTEND_DIST
WHITENOISE_INDEX_FILE = True

# En production, compression + cache-busting des statiques Django (admin).
if not DEBUG:
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
        },
    }

# Media files (photos CNI) — stockées hors de la racine web publique
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Authentification JWT (implémentation maison — cf. AUTH-01/02)
JWT_SECRET = os.getenv("JWT_SECRET", SECRET_KEY)
JWT_ALGORITHM = "HS256"
# Durée de vie du token d'accès : 8 heures (cahier des charges AUTH-02)
JWT_ACCESS_LIFETIME_HOURS = int(os.getenv("JWT_ACCESS_LIFETIME_HOURS", "8"))
# Durée de vie du token de rafraîchissement : 7 jours
JWT_REFRESH_LIFETIME_DAYS = int(os.getenv("JWT_REFRESH_LIFETIME_DAYS", "7"))

# URL de base du formulaire public (encodée dans les QR Codes — cf. ACT-02)
PUBLIC_FORM_BASE_URL = os.getenv("PUBLIC_FORM_BASE_URL", "http://localhost:5174")


# Confiance du proxy pour déterminer l'IP cliente (audit, anti-spam).
# À n'activer (True) que derrière un reverse proxy de confiance (Nginx) qui
# réécrit l'en-tête X-Forwarded-For. Si l'app est exposée directement, laisser
# False : sinon un client pourrait usurper son IP via cet en-tête.
TRUST_PROXY = env_bool("DJANGO_TRUST_PROXY", False)


# Limitation de débit (anti-bruteforce / anti-spam) — cf. apps/throttle.py
# Connexion : nombre d'échecs tolérés par IP avant blocage temporaire.
LOGIN_RATELIMIT = int(os.getenv("LOGIN_RATELIMIT", "10"))
LOGIN_RATELIMIT_WINDOW = int(os.getenv("LOGIN_RATELIMIT_WINDOW", "900"))  # 15 min
# Formulaire public : soumissions tolérées par IP et par fenêtre. À AJUSTER selon
# la taille des événements : derrière un Wi-Fi/4G partagé (même IP publique), une
# limite trop basse bloquerait des participants légitimes lors d'un afflux.
PUBLIC_RATELIMIT = int(os.getenv("PUBLIC_RATELIMIT", "60"))
PUBLIC_RATELIMIT_WINDOW = int(os.getenv("PUBLIC_RATELIMIT_WINDOW", "300"))  # 5 min


# Journalisation (Sprint 6) — console + fichier tournant dans logs/
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_LEVEL = os.getenv("DJANGO_LOG_LEVEL", "INFO")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{asctime} [{levelname}] {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOG_DIR / "app.log",
            "maxBytes": 5 * 1024 * 1024,  # 5 Mo
            "backupCount": 5,
            "formatter": "verbose",
            "encoding": "utf-8",
        },
    },
    "root": {
        "handlers": ["console", "file"],
        "level": LOG_LEVEL,
    },
    "loggers": {
        "django": {
            "handlers": ["console", "file"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        # Activer le log des requêtes SQL en mettant DJANGO_LOG_SQL=DEBUG.
        "django.db.backends": {
            "handlers": ["console"],
            "level": os.getenv("DJANGO_LOG_SQL", "WARNING"),
            "propagate": False,
        },
    },
}
