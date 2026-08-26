#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  Déploiement — Gestion de Présence
#  Exécuté par GitHub Actions (via SSH) ou à la main :  bash deploy/deploy.sh
# ═══════════════════════════════════════════════════════════════════════════
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"
SERVICE="${DEPLOY_SERVICE:-presence}"
SOCKET="${DEPLOY_SOCKET:-/run/presence.sock}"
HOSTNAME_APP="${DEPLOY_HOST:-liste.rsekoua.org}"

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m❌ %s\033[0m\n' "$*" >&2; exit 1; }

# --- Un seul déploiement à la fois -----------------------------------------
# Deux pushes rapprochés lanceraient sinon deux `git reset` + deux builds npm
# concurrents dans le même dossier, avec un résultat imprévisible.
exec 9>"$ROOT/deploy/.deploy.lock"
flock -n 9 || fail "Un déploiement est déjà en cours (verrou deploy/.deploy.lock)."

cd "$ROOT"

# --- Contrôles préalables ---------------------------------------------------
[ -f backend/.env ] || fail "backend/.env absent — copier deploy/.env.prod.example et le renseigner."
# Le .env contient les secrets de production : il ne doit être lisible que par
# le compte applicatif. Un .env en 644 est lisible par tout compte du serveur.
perms="$(stat -c '%a' backend/.env)"
[ "$perms" = "600" ] || [ "$perms" = "640" ] || \
    fail "backend/.env est en mode $perms — attendu 600. Corriger : chmod 600 backend/.env"

log "Enregistrement du commit courant (rollback)"
PREVIOUS_SHA="$(git rev-parse HEAD)"
echo "$PREVIOUS_SHA" > deploy/.last_deploy_sha

# --- Récupération du code ---------------------------------------------------
log "Récupération de origin/$BRANCH"
# `fetch` + `reset --hard` plutôt que `pull` : ce dossier est une cible de
# déploiement, pas un espace de travail. Le dépôt doit refléter exactement
# l'état de la branche, sans se bloquer sur un fichier modifié localement
# (npm réécrit parfois package-lock.json) ni tenter une fusion.
git fetch --prune origin "$BRANCH"
git reset --hard "origin/$BRANCH"
# Retire les fichiers non suivis laissés par un ancien commit (un module
# supprimé du dépôt, par exemple). Volontairement SANS `-x` : les fichiers
# ignorés sont épargnés, or ce sont exactement ceux qui portent l'état du
# serveur — backend/.env (secrets), backend/media (photos de CNI),
# backend/logs, .venv, node_modules.
git clean -fd
NEW_SHA="$(git rev-parse HEAD)"
log "Déploiement de $NEW_SHA (précédent : $PREVIOUS_SHA)"

# --- Backend ----------------------------------------------------------------
log "Backend : dépendances"
cd "$ROOT/backend"
uv sync --no-dev --frozen   # --frozen : échoue si uv.lock ne correspond plus au pyproject

log "Backend : contrôles de déploiement Django"
# `check --deploy` refait la liste de contrôle sécurité officielle de Django
# (cookies, HSTS, DEBUG, ALLOWED_HOSTS…) et échoue AVANT tout redémarrage.
.venv/bin/python manage.py check --deploy --fail-level WARNING

log "Backend : migrations"
.venv/bin/python manage.py migrate --noinput
# Table de cache : support des compteurs anti-bruteforce, partagés entre les
# workers Gunicorn. Idempotent — ne fait rien si la table existe déjà.
.venv/bin/python manage.py createcachetable

log "Backend : fichiers statiques"
.venv/bin/python manage.py collectstatic --noinput

# Précompilation du bytecode : le service tourne avec ProtectSystem=strict, donc
# sur une arborescence en lecture seule où Python ne pourrait plus écrire ses
# .pyc. Les produire maintenant évite de recompiler à chaque démarrage.
.venv/bin/python -m compileall -q apps config manage.py > /dev/null

# --- Frontend ---------------------------------------------------------------
log "Frontend : build"
cd "$ROOT/frontend-v2"
npm ci --no-audit --fund=false
npm run build   # sort dans backend/frontend_dist (cf. vite.config.ts)

# --- Permissions ------------------------------------------------------------
log "Permissions"
cd "$ROOT"
# Nginx (www-data) doit LIRE les statiques ; il ne doit jamais pouvoir écrire.
chmod -R a+rX backend/frontend_dist backend/staticfiles
# Les photos de CNI ne sont lues que par l'application : ni Nginx, ni les
# autres comptes du serveur n'y ont accès.
chmod 700 backend/media 2>/dev/null || true
chmod 600 backend/.env

# --- Redémarrage ------------------------------------------------------------
log "Redémarrage du service $SERVICE"
sudo /usr/bin/systemctl restart "$SERVICE"

# --- Vérification de santé --------------------------------------------------
log "Vérification de santé"
healthy=0
for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 2
    # Requête sur la socket Unix : teste Gunicorn+Django directement, sans
    # dépendre de Nginx ni du DNS. `X-Forwarded-Proto: https` est nécessaire,
    # sinon SECURE_SSL_REDIRECT répond 301 ; `Host` doit figurer dans
    # DJANGO_ALLOWED_HOSTS, sinon Django répond 400.
    if curl -sf --max-time 5 --unix-socket "$SOCKET" \
            -H "Host: $HOSTNAME_APP" \
            -H "X-Forwarded-Proto: https" \
            "http://localhost/api/health" > /dev/null; then
        healthy=1
        break
    fi
    echo "   tentative $i/10…"
done

if [ "$healthy" -ne 1 ]; then
    log "Application muette après redémarrage — retour à $PREVIOUS_SHA"
    git reset --hard "$PREVIOUS_SHA"
    cd "$ROOT/backend" && uv sync --no-dev --frozen && .venv/bin/python manage.py collectstatic --noinput
    cd "$ROOT/frontend-v2" && npm ci --no-audit --fund=false && npm run build
    sudo /usr/bin/systemctl restart "$SERVICE"
    fail "Déploiement annulé, version précédente restaurée.
    ⚠️  Les migrations de base NE SONT PAS annulées (Django ne sait pas les
        inverser de façon fiable). Si l'échec vient d'une migration, restaurer
        le dernier dump : cf. deploy/backup.sh et deploy/README.md § Rollback.
    Journal : journalctl -u $SERVICE -n 80 --no-pager"
fi

log "Déploiement terminé — $NEW_SHA"
