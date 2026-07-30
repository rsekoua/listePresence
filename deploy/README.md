# Déploiement — Gestion de Présence

Pile : **Django (Gunicorn) + WhiteNoise + React (frontend-v2, build Vite) + Nginx**,
sur Ubuntu 22.04/24.04, en **mono-origine** : Gunicorn sert tout (API, admin, build
React) ; Nginx n'est qu'un reverse proxy + terminaison TLS (cf. `nginx.conf`).

Ce dossier fournit des modèles à adapter :

| Fichier | Rôle |
|---|---|
| `nginx.conf` | Reverse proxy vers Gunicorn (127.0.0.1:8000), tout le trafic |
| `gunicorn.service` | Service systemd lançant Gunicorn (WSGI Django) |
| `deploy.sh` | Script de mise à jour (git pull → migrate → collectstatic → build front → restart) |
| `.env.prod.example` | Variables d'environnement de production (à copier en `backend/.env`) |
| `backup.sh` | Sauvegarde quotidienne (dump base + archive médias, rétention 30 j) |

## 0. DNS (Cloudflare)
Dans le dashboard Cloudflare du domaine `rsekoua.org` → **DNS** → Add record :
`A` · `justif-lhspla` · `<IP publique du VPS>` · Proxy status **DNS only (nuage gris)**.
Le mode proxy Cloudflare est désactivé pour l'instant, le temps que Certbot (étape 6)
puisse valider le domaine directement contre le VPS.

## 1. Pré-requis serveur
```bash
sudo apt update && sudo apt install -y nginx git nodejs npm
curl -LsSf https://astral.sh/uv/install.sh | sh   # gestionnaire de paquets Python
```

## 2. Récupération + configuration
Dépôt **privé** : génère une clé de déploiement dédiée sur le VPS et ajoute-la
en lecture seule sur GitHub (Settings → Deploy keys) avant de cloner.
```bash
ssh-keygen -t ed25519 -C "vps-presence" -f ~/.ssh/id_ed25519_presence -N ""
cat ~/.ssh/id_ed25519_presence.pub   # à coller dans GitHub → Deploy keys (lecture seule)

cat >> ~/.ssh/config <<'EOF'
Host github-presence
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_presence
EOF

sudo mkdir -p /var/www/presence && sudo chown $USER /var/www/presence
git clone git@github-presence:rsekoua/listePresence.git /var/www/presence
cd /var/www/presence
git checkout justif                   # branche à déployer

cd backend
cp ../deploy/.env.prod.example .env   # puis éditer les secrets (clés, domaine)
uv sync --no-dev                      # gunicorn est déjà une dépendance du projet
```

## 3. Base de données
**SQLite par défaut** (déjà configuré, rien à installer) — largement suffisant pour
cet usage. La base est pilotée par l'environnement : elle ne bascule sur PostgreSQL
que si `DB_NAME` est défini dans `.env` (voir les lignes commentées de
`.env.prod.example` si besoin un jour de PostgreSQL).

## 4. Premier déploiement
```bash
cd /var/www/presence/backend
uv run python manage.py migrate
uv run python manage.py createsuperuser   # compte admin initial
uv run python manage.py collectstatic --noinput

cd ../frontend-v2 && npm ci && npm run build   # sort dans backend/frontend_dist
```

## 5. Services
```bash
sudo cp deploy/gunicorn.service /etc/systemd/system/presence.service
sudo systemctl daemon-reload && sudo systemctl enable --now presence

sudo cp deploy/nginx.conf /etc/nginx/sites-available/presence
sudo ln -s /etc/nginx/sites-available/presence /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 6. HTTPS (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d justif-lhspla.rsekoua.org
```

## 7. Vérification
- `https://justif-lhspla.rsekoua.org/admin/` → page de connexion Django (compte créé à l'étape 4).
- `https://justif-lhspla.rsekoua.org/` → application React.
- `sudo systemctl status presence` et `journalctl -u presence -f` en cas de souci.

## 8. Mises à jour suivantes
```bash
bash deploy/deploy.sh
```

## Notes
- Les **photos CNI** ne sont jamais servies publiquement (`/media` non exposé) : elles
  transitent uniquement par l'API authentifiée. Ne pas ajouter de `location /media/`.
- Les **logs** applicatifs sont écrits dans `backend/logs/app.log` (rotation 5×5 Mo) et
  sur la sortie standard (récupérée par journald via systemd : `journalctl -u presence`).
- **Sauvegardes** : `deploy/backup.sh` (dump base + archive `media/`, purge > 30 j).
  Planifier via cron, ex. quotidien à 2h :
  `0 2 * * * /usr/local/bin/presence-backup.sh >> /var/log/presence-backup.log 2>&1`
