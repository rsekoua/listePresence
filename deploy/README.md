# Déploiement — Gestion de Présence

Pile : **Django (Gunicorn) + WhiteNoise + React (frontend-v2, build Vite) + Nginx + MySQL**,
sur Ubuntu 22.04/24.04, en **mono-origine** : Gunicorn sert tout (API, admin, build
React) ; Nginx n'est qu'un reverse proxy + terminaison TLS (cf. `nginx.conf`).

**Déploiement continu** : chaque push sur `main` déclenche `.github/workflows/deploy.yml`
(GitHub Actions), qui lance les tests puis, s'ils passent, se connecte en SSH au VPS
et exécute `deploy/deploy.sh`. Ce dossier fournit les modèles utilisés :

| Fichier | Rôle |
|---|---|
| `nginx.conf` | Reverse proxy vers Gunicorn (127.0.0.1:8000), tout le trafic |
| `gunicorn.service` | Service systemd lançant Gunicorn (WSGI Django) |
| `deploy.sh` | Script de mise à jour (git pull → migrate → collectstatic → build front → restart → health-check). Appelé automatiquement par GitHub Actions, ou à la main. |
| `.env.prod.example` | Variables d'environnement de production (à copier en `backend/.env`) |
| `backup.sh` | Sauvegarde quotidienne (dump MySQL + archive médias, rétention 30 j) |

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
MySQL est supposé déjà installé sur le VPS.

## 2. Base de données MySQL
```bash
sudo mysql -e "
CREATE DATABASE presence CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'presence'@'localhost' IDENTIFIED BY 'CHANGE_ME_db_password';
GRANT ALL PRIVILEGES ON presence.* TO 'presence'@'localhost';
FLUSH PRIVILEGES;
"
```

## 3. Deux paires de clés SSH (à ne pas confondre)

**a) Clé de déploiement (lecture seule)** — pour que le VPS clone le dépôt privé :
```bash
ssh-keygen -t ed25519 -C "vps-presence-readonly" -f ~/.ssh/id_ed25519_presence -N ""
cat ~/.ssh/id_ed25519_presence.pub   # à coller dans GitHub → Settings → Deploy keys (lecture seule)

cat >> ~/.ssh/config <<'EOF'
Host github-presence
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_presence
EOF
```

**b) Clé d'action (pour GitHub Actions)** — pour que la CI se connecte en SSH
au VPS et lance `deploy.sh` :
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/id_ed25519_gh_actions -N ""
cat ~/.ssh/id_ed25519_gh_actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/id_ed25519_gh_actions        # clé PRIVÉE → secret GitHub SSH_PRIVATE_KEY (étape 8)
```

## 4. Récupération + configuration
```bash
sudo mkdir -p /var/www/presence && sudo chown $USER /var/www/presence
git clone git@github-presence:rsekoua/listePresence.git /var/www/presence
cd /var/www/presence
git checkout main

cd backend
cp ../deploy/.env.prod.example .env   # puis éditer les secrets (clés, mot de passe DB)
uv sync --no-dev                      # gunicorn est déjà une dépendance du projet
```

## 5. Premier déploiement (manuel, avant d'activer le CD)
```bash
cd /var/www/presence/backend
uv run python manage.py migrate
uv run python manage.py createsuperuser   # compte admin initial
uv run python manage.py collectstatic --noinput

cd ../frontend-v2 && npm ci && npm run build   # sort dans backend/frontend_dist
```

## 6. Services
```bash
sudo cp deploy/gunicorn.service /etc/systemd/system/presence.service
sudo systemctl daemon-reload && sudo systemctl enable --now presence

sudo cp deploy/nginx.conf /etc/nginx/sites-available/presence
sudo ln -s /etc/nginx/sites-available/presence /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 7. HTTPS (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d justif-lhspla.rsekoua.org
```

## 8. Sudo sans mot de passe pour le déploiement automatique
`deploy.sh` redémarre les services via `sudo`. Pour que GitHub Actions (connecté
avec la clé d'action de l'étape 3b) puisse déployer sans prompt interactif,
autoriser **uniquement ces deux commandes** sans mot de passe pour l'utilisateur
de déploiement (`sudo visudo`) :
```
<user> ALL=(root) NOPASSWD: /usr/bin/systemctl restart presence, /usr/bin/systemctl reload nginx
```
(Ne pas donner `NOPASSWD: ALL` — inutile et risqué.)

## 9. Activer le déploiement continu (GitHub Actions)
Dans GitHub → Settings du repo → **Secrets and variables → Actions**, créer :

| Secret | Valeur |
|---|---|
| `SSH_HOST` | IP ou nom d'hôte du VPS |
| `SSH_USER` | utilisateur de déploiement sur le VPS |
| `SSH_PRIVATE_KEY` | clé **privée** générée à l'étape 3b (`id_ed25519_gh_actions`) |

Le workflow `.github/workflows/deploy.yml` (à la racine du dépôt) se charge du reste :
tests backend/frontend à chaque push sur `main`, puis déploiement automatique via SSH
si les tests passent.

## 10. Vérification
- `https://justif-lhspla.rsekoua.org/admin/` → page de connexion Django (compte créé à l'étape 5).
- `https://justif-lhspla.rsekoua.org/` → application React.
- `https://justif-lhspla.rsekoua.org/api/health` → `{"status": "ok"}`.
- `sudo systemctl status presence` et `journalctl -u presence -f` en cas de souci.
- Onglet **Actions** du repo GitHub : suivre les jobs `test` et `deploy` à chaque push.

## 11. Mises à jour suivantes
Automatiques (push sur `main`). En manuel si besoin :
```bash
bash deploy/deploy.sh
```

## Rollback
`deploy.sh` enregistre le commit précédent dans `deploy/.last_deploy_sha` avant
chaque `git pull`. En cas de déploiement cassé :
```bash
git checkout "$(cat deploy/.last_deploy_sha)"
bash deploy/deploy.sh
```
Pas de rollback automatique des migrations Django (généralement irréversible
proprement) — restaurer depuis le dernier dump MySQL (`deploy/backup.sh`) en
dernier recours si une migration a corrompu des données.

## Notes
- Les **photos CNI** ne sont jamais servies publiquement (`/media` non exposé) : elles
  transitent uniquement par l'API authentifiée. Ne pas ajouter de `location /media/`.
- Les **logs** applicatifs sont écrits dans `backend/logs/app.log` (rotation 5×5 Mo) et
  sur la sortie standard (récupérée par journald via systemd : `journalctl -u presence`).
- **Sauvegardes** : `deploy/backup.sh` (dump MySQL + archive `media/`, purge > 30 j).
  Planifier via cron, ex. quotidien à 2h :
  `0 2 * * * /usr/local/bin/presence-backup.sh >> /var/log/presence-backup.log 2>&1`
