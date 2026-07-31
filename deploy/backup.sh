#!/usr/bin/env bash
# Sauvegarde — Gestion de Présence
# - dump MySQL (compressé)
# - archive des photos CNI (media/)
# - rétention configurable (défaut 30 jours)
#
# Installation (cron quotidien à 2h, voir aussi crontab plus bas) :
#   sudo cp deploy/backup.sh /usr/local/bin/presence-backup.sh
#   sudo chmod +x /usr/local/bin/presence-backup.sh
set -euo pipefail

# --- Configuration (adapter ou exporter via l'environnement) ---------------
APP_DIR="${APP_DIR:-/var/www/presence}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/presence}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Charge les variables du .env (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT)
if [ -f "$APP_DIR/backend/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$APP_DIR/backend/.env"
    set +a
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# --- Dump MySQL --------------------------------------------------------
if [ -n "${DB_NAME:-}" ]; then
    echo "==> Dump MySQL ($DB_NAME)"
    # MYSQL_PWD plutôt que -p<mdp> : évite d'exposer le mot de passe dans la
    # liste des processus (ps aux) visible par les autres utilisateurs du serveur.
    MYSQL_PWD="${DB_PASSWORD:-}" mysqldump \
        -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" \
        -u "${DB_USER:-presence}" \
        --single-transaction --default-character-set=utf8mb4 \
        "$DB_NAME" \
        | gzip > "$BACKUP_DIR/db_${STAMP}.sql.gz"
else
    echo "==> DB_NAME non défini : sauvegarde de db.sqlite3"
    cp "$APP_DIR/backend/db.sqlite3" "$BACKUP_DIR/db_${STAMP}.sqlite3"
fi

# --- Archive des médias (photos CNI) ---------------------------------------
if [ -d "$APP_DIR/backend/media" ]; then
    echo "==> Archive des médias"
    tar czf "$BACKUP_DIR/media_${STAMP}.tar.gz" -C "$APP_DIR/backend" media
fi

# --- Rétention --------------------------------------------------------------
echo "==> Purge des sauvegardes de plus de ${RETENTION_DAYS} jours"
find "$BACKUP_DIR" -type f -mtime +"$RETENTION_DAYS" -delete

echo "==> Sauvegarde terminée : $BACKUP_DIR (horodatage $STAMP)"

# Exemple de planification (crontab -e), tous les jours à 02h00 :
#   0 2 * * * /usr/local/bin/presence-backup.sh >> /var/log/presence-backup.log 2>&1
