# Backend — Gestion de Présence aux Activités

API du système web de gestion de présence aux activités (collecte via QR Code,
photos CNI, exports Excel/PDF).

## Stack

- **Django 6** — structure, ORM, admin
- **Django Ninja** — API REST typée
- **SQLite / PostgreSQL** — base de données (configurable par variable d'environnement)
- **PyJWT** — authentification JWT maison
- **Pillow** — traitement des images CNI
- **qrcode** — génération des QR Codes
- **openpyxl** — exports Excel
- **reportlab** — exports PDF (fiches CNI, listes de présence)
- **Python 3.14** / **uv** — gestion de l'environnement

## Structure

```
backend/
├── config/            # Projet Django (settings, urls, api Ninja)
│   ├── settings.py
│   ├── urls.py
│   └── api.py         # Instance NinjaAPI + routeurs
├── accounts/          # Auth JWT, comptes (User UUID), RBAC & journal d'audit
├── activites/         # Gestion des activités, QR Code, clone, seed_demo
├── participants/      # Formulaire public, participants & annuaire (anti-doublon CNI)
├── exports/           # Exports Excel / PDF / ZIP + historique des exports
├── logs/              # Journaux applicatifs
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
- [x] **Sprint 2** — Auth JWT maison, modèle Activite, CRUD + QR Code
- [x] **RBAC** — rôles admin/organisateur, visibilité globale, édition restreinte, clone
- [x] **Sprint 3** — Formulaire public, endpoints publics, traitement CNI (Pillow), anti-doublon
- [x] **Sprint 4** — Tableau de bord : liste/filtres participants, stats, photos CNI protégées, statut
- [x] **Sprint 5** — Exports Excel / PDF (fiche CNI, liste de présence) / ZIP, filtres, historique
- [x] **Sprint 6** — Tests automatisés, logging, optimisation des requêtes, déploiement
- [x] **Annuaire** — personnes dédupliquées par CNI, historique par personne, scope organisateur
- [x] **Journal d'audit** — traçage des actions utilisateurs, logs par utilisateur (admin)
- [x] **Base configurable** — SQLite (dev) / PostgreSQL (prod) par variable d'environnement

> ✅ Tous les sprints du cahier des charges sont livrés. Suite de tests : 45 tests au vert
> (`uv run python manage.py test`).
