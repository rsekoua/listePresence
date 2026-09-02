# frontend-v2 — Refonte UI (Mantine)

Nouvelle interface de l'application **Liste de Présence**, reconstruite avec
**Mantine v9** en remplacement de Material UI. Le **backend Django Ninja n'a pas
changé** : ce front consomme la même API (`/api`).

## Stack

| Domaine | Choix |
|---|---|
| Framework | React 19 + Vite + TypeScript |
| Bibliothèque UI | **Mantine v9** (`@mantine/core`, `hooks`, `form`, `dates`, `notifications`, `modals`) |
| Tableaux | **mantine-datatable** (remplace MUI X DataGrid) |
| Icônes | `@tabler/icons-react` |
| Données | TanStack Query + Axios |
| Validation | Zod (+ `mantine-form-zod-resolver`) |
| Routage | React Router 7 |
| Recadrage CNI | `react-easy-crop` + `browser-image-compression` |

La couche `src/api/` (client Axios, types, modules d'endpoints) est **réutilisée
telle quelle** depuis l'ancien front : elle n'a aucune dépendance UI.

## Démarrage

```bash
npm install          # legacy-peer-deps activé via .npmrc (TS 6 vs peer deps)
npm run dev          # http://localhost:5174 (proxy /api → 127.0.0.1:8000)
```

Le backend doit tourner en parallèle :

```bash
cd ../backend && uv run python manage.py runserver
```

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (port 5174) |
| `npm run build` | `tsc -b` + build de production |
| `npm run lint` | ESLint |
| `npm run gen:api` | Régénère `src/api/schema.d.ts` depuis `openapi.json` |

### Régénérer les types de l'API

```bash
# 1) Exporter le schéma depuis le backend (script ponctuel) :
#    python -c "import os,json,django; os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings'); \
#               django.setup(); from config.api import api; \
#               open('openapi.json','w',encoding='utf-8').write(json.dumps(api.get_openapi_schema()))"
# 2) Copier openapi.json ici puis :
npm run gen:api
```

## Thème

Palette « Ocean Cyan » (cyan `#0891b2`), police Inter, densité compacte — transposée
de l'ancien thème MUI vers Mantine dans `src/theme.ts`.

## Plan de bascule

Ce dossier vit **en parallèle** de `../frontend` (l'ancien front MUI reste
fonctionnel). Quand cette version est validée :

1. Renommer `frontend` → `frontend-mui-legacy` (archive).
2. Renommer `frontend-v2` → `frontend`.
3. Adapter le port du dev server / la config de déploiement (`deploy/`) si besoin
   (l'ancien tournait sur 5173, celui-ci sur 5174).
