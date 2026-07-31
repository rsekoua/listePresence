#!/usr/bin/env bash
# Déploiement — Gestion de Présence
# Usage : bash deploy/deploy.sh   (depuis la racine du projet sur le serveur)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Enregistrement du commit courant (rollback)"
git rev-parse HEAD > deploy/.last_deploy_sha || true

echo "==> Récupération du code"
git pull --ff-only

echo "==> Backend : dépendances + migrations + statiques"
cd "$ROOT/backend"
uv sync --no-dev
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput

echo "==> Frontend : build"
cd "$ROOT/frontend-v2"
npm ci
npm run build   # sort directement dans backend/frontend_dist (cf. vite.config.ts)

echo "==> Redémarrage du service"
sudo systemctl restart presence      # Gunicorn (Nginx est géré par CloudPanel, pas de reload ici)

echo "==> Vérification de santé"
sleep 2
if ! curl -sf http://127.0.0.1:8000/api/health > /dev/null; then
    echo "❌ L'application ne répond pas après le redémarrage (voir : journalctl -u presence -n 50)"
    exit 1
fi

echo "==> Déploiement terminé."
