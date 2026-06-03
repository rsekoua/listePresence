# Frontend — Gestion de Présence aux Activités

Interface SPA (organisateur + formulaire public) du système de gestion de présence.

## Stack

- **React 19 + Vite** (TypeScript)
- **Material UI (MUI)** — composants + thème (locale française)
- **React Router** — routing public / protégé
- **Axios** — client HTTP (proxy `/api` vers le backend Django)
- **React Query** — cache et appels API
- **React Hook Form + Zod** — formulaires typés et validés

## Structure

```
frontend/src/
├── api/client.ts          # Instance Axios + interceptors JWT
├── auth/
│   ├── AuthContext.tsx     # Contexte d'authentification (token localStorage)
│   └── ProtectedRoute.tsx  # Garde de route
├── theme/theme.ts          # Thème MUI (fr-FR, mobile-first)
├── pages/
│   ├── LoginPage.tsx        # Connexion organisateur
│   ├── DashboardPage.tsx    # Tableau de bord (protégé)
│   └── PublicFormPage.tsx   # Formulaire public /form/:token
├── App.tsx                 # Définition des routes
└── main.tsx                # Providers (Theme, Query, Auth, Router)
```

## Démarrage

```bash
npm install
npm run dev      # http://localhost:5173 (proxy /api -> http://127.0.0.1:8000)
npm run build    # vérification TypeScript + build de production
```

> Le backend Django doit tourner en parallèle (`cd ../backend && uv run python manage.py runserver`).

## Routes

| Route          | Accès      | Description                          |
| -------------- | ---------- | ------------------------------------ |
| `/login`       | Public     | Connexion organisateur               |
| `/form/:token` | Public     | Formulaire de collecte (QR Code)     |
| `/dashboard`   | Protégé    | Tableau de bord organisateur         |

## Avancement

- [x] **Sprint 1** — Init Vite, MUI + thème, routing public/protégé, proxy Axios, page Login statique
- [x] **Sprint 2** — Login JWT réel, Dashboard (DataGrid), création d'activité (date pickers), page détail + QR Code téléchargeable
- [x] **RBAC** — rôles, édition/clonage, colonne organisateur, gating UI
- [x] **Sprint 3** — Formulaire public mobile (/form/:token), upload + compression CNI, confirmation, mode hors-ligne
- [x] **Sprint 4** — Section participants (table/cartes, recherche, filtres, compteur 30 s), stats, fiche + photos CNI
- [ ] Sprint 5 — Exports Excel / PDF / ZIP
