#!/usr/bin/env bash
# Déploiement — Gestion de Présence
# Usage : bash deploy/deploy.sh   (depuis la racine du projet sur le serveur)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Récupération du code"
git pull --ff-only

echo "==> Backend : dépendances + migrations + statiques"
cd "$ROOT/backend"
# uv (recommandé) ; sinon adapter à pip + venv
uv sync --no-dev
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput

echo "==> Frontend : build"
cd "$ROOT/frontend-v2"
npm ci
npm run build   # sort directement dans backend/frontend_dist (cf. vite.config.ts)

echo "==> Redémarrage des services"
sudo systemctl restart presence      # Gunicorn
sudo systemctl reload nginx

echo "==> Déploiement terminé."
