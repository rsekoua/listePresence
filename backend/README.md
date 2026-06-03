# Backend — Gestion de Présence aux Activités

API du système web de gestion de présence aux activités (collecte via QR Code,
photos CNI, exports Excel/PDF).

## Stack

- **Django 6** — structure, ORM, admin
- **Django Ninja** — API REST typée
- **SQLite** — base de données (MVP)
- **Pillow** — traitement des images CNI
- **qrcode** — génération des QR Codes
- **Python 3.14** / **uv** — gestion de l'environnement

## Structure

```
backend/
├── config/            # Projet Django (settings, urls, api Ninja)
│   ├── settings.py
│   ├── urls.py
│   └── api.py         # Instance NinjaAPI + routeurs
├── accounts/          # Authentification & comptes organisateurs (User UUID)
├── activites/         # Gestion des activités + QR Code
├── participants/      # Formulaire public & participants
├── exports/           # Exports Excel / PDF / ZIP
├── media/             # Photos CNI (hors versioning)
└── manage.py
```

## Installation

```bash
# 1. Installer les dépendances
uv sync

# 2. Configurer l'environnement
cp .env.example .env
# Générer une clé secrète :
uv run python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
# puis renseigner DJANGO_SECRET_KEY dans .env

# 3. Appliquer les migrations
uv run python manage.py migrate

# 4. Créer un compte organisateur (super-utilisateur)
uv run python manage.py createsuperuser

# 5. Lancer le serveur de développement
uv run python manage.py runserver
```

## Points d'accès

| URL                         | Description                          |
| --------------------------- | ------------------------------------ |
| `http://127.0.0.1:8000/api/docs`   | Documentation interactive de l'API |
| `http://127.0.0.1:8000/api/health` | Vérification de disponibilité      |
| `http://127.0.0.1:8000/admin/`     | Interface d'administration Django  |

## Variables d'environnement

| Variable               | Défaut                  | Rôle                         |
| ---------------------- | ----------------------- | ---------------------------- |
| `DJANGO_SECRET_KEY`    | (clé de dev)            | Clé secrète Django           |
| `DJANGO_DEBUG`         | `True`                  | Mode debug                   |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1`   | Hôtes autorisés (séparés `,`)|

## Avancement

- [x] **Sprint 1** — Setup & infrastructure (projet, apps, SQLite, API Ninja, media)
- [ ] Sprint 2 — Auth JWT & gestion des activités
- [ ] Sprint 3 — Formulaire public & upload CNI
- [ ] Sprint 4 — Tableau de bord participants
- [ ] Sprint 5 — Exports Excel / PDF / ZIP
- [ ] Sprint 6 — Tests & déploiement
