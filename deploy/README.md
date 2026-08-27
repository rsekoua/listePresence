# Déploiement — Gestion de Présence

**Pile** : Django 6 (Gunicorn) + React (Vite) + PostgreSQL, sur VPS Ubuntu avec
**Nginx en frontal**, en **mono-origine** — un seul domaine sert l'API, l'admin
et l'application React.

| | |
|---|---|
| Domaine | `liste.rsekoua.org` |
| Racine | `/var/www/liste` |
| Compte système | `presence` (dédié, sans privilège) |
| Service | `presence.service` + `presence.socket` (systemd) |
| Socket | `/run/presence.sock` (Unix — aucun port TCP exposé) |

**Déploiement continu** : chaque push sur `main` déclenche
`.github/workflows/deploy.yml` — tests, contrôle de sécurité Django, build, puis
connexion SSH au VPS et exécution de `deploy/deploy.sh`.

| Fichier | Rôle |
|---|---|
| `nginx.conf` | Vhost Nginx : TLS, en-têtes de sécurité, limitation de débit, statiques |
| `nginx-security-headers.conf` | En-têtes de sécurité communs (snippet inclus par le vhost) |
| `presence.socket` | Socket Unix d'écoute (systemd) |
| `presence.service` | Service Gunicorn, bac à sable systemd |
| `deploy.sh` | Mise à jour : fetch → migrate → build → restart → santé → rollback |
| `.env.prod.example` | Modèle des variables de production |
| `backup.sh` | Sauvegarde quotidienne (dump PostgreSQL + photos, rétention 30 j) |

---

## 0. DNS (Cloudflare)

`rsekoua.org` → **DNS** → Add record :
`A` · `liste` · `<IP publique du VPS>` · Proxy **DNS only** (nuage gris).

Le proxy Cloudflare reste désactivé le temps que Let's Encrypt valide le domaine
directement contre le VPS (étape 6). Vous pourrez l'activer ensuite ; si vous le
faites, passez le mode SSL Cloudflare sur **Full (strict)** — en mode *Flexible*,
le trafic entre Cloudflare et votre VPS repartirait en clair.

## 1. Paquets et compte système

```bash
sudo apt update
sudo apt install -y nginx git curl postgresql nodejs npm
curl -LsSf https://astral.sh/uv/install.sh | sudo env UV_INSTALL_DIR=/usr/local/bin sh
```

Compte système dédié à l'application. Il possède le code, mais n'a ni sudo
général, ni accès aux autres sites du serveur :

```bash
sudo adduser --system --group --shell /bin/bash \
     --home /var/www/liste presence
sudo usermod -aG presence www-data      # Nginx doit lire les statiques
sudo mkdir -p /var/www/liste /var/www/certbot
sudo chown presence:presence /var/www/liste
sudo chmod 750 /var/www/liste
```

> `chmod 750` : les autres comptes du serveur n'entrent pas dans le dossier.
> `www-data` y accède par le groupe `presence`.

Pare-feu — seuls SSH et le web doivent être joignables. PostgreSQL en
particulier n'a rien à faire sur l'Internet (il écoute déjà sur `127.0.0.1`
par défaut, ceci est la seconde barrière) :

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 2. Base de données PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE presence;
CREATE USER presence WITH PASSWORD 'MOT_DE_PASSE_FORT';
-- Propriétaire de la base (pas seulement des privilèges GRANT) : depuis
-- PostgreSQL 15, un rôle non-propriétaire ne peut plus créer de table dans
-- le schéma "public" par défaut. Sans ceci, la première migration Django
-- échouerait avec "permission denied for schema public".
ALTER DATABASE presence OWNER TO presence;
SQL
```

Le rôle `presence` n'a de droits que sur cette base ; `pg_hba.conf` (fichier
d'authentification de PostgreSQL) n'autorise par défaut que les connexions
locales (`peer`/`scram-sha-256` sur `127.0.0.1`), donc rien à ouvrir côté
réseau — cf. la note sur le pare-feu ci-dessus.

## 3. Clés SSH (deux paires, à ne pas confondre)

**a) Clé de déploiement — le VPS lit le dépôt GitHub** (lecture seule) :

```bash
sudo -u presence ssh-keygen -t ed25519 -C "vps-presence-readonly" \
     -f /var/www/liste/.ssh/id_ed25519_presence -N ""
sudo -u presence cat /var/www/liste/.ssh/id_ed25519_presence.pub
# → GitHub → repo → Settings → Deploy keys → Add (NE PAS cocher "Allow write access")

sudo -u presence tee -a /var/www/liste/.ssh/config >/dev/null <<'EOF'
Host github-presence
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_presence
    IdentitiesOnly yes
EOF
```

**b) Clé d'action — GitHub Actions se connecte au VPS** :

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/gh_actions_key -N ""
sudo -u presence mkdir -p /var/www/liste/.ssh
cat ~/gh_actions_key.pub | sudo -u presence tee -a \
    /var/www/liste/.ssh/authorized_keys
sudo chmod 700 /var/www/liste/.ssh
sudo chmod 600 /var/www/liste/.ssh/authorized_keys
cat ~/gh_actions_key      # clé PRIVÉE → secret GitHub SSH_PRIVATE_KEY (étape 9)
rm ~/gh_actions_key       # ne pas la laisser traîner sur le VPS
```

Durcir le serveur SSH pendant qu'on y est (`/etc/ssh/sshd_config`) — sans cela,
le mot de passe du compte `presence` devient une porte d'entrée bruteforçable :

```
PasswordAuthentication no
PermitRootLogin no
```
```bash
sudo systemctl restart ssh
```

## 4. Récupération du code et configuration

```bash
sudo -u presence -H bash
cd /var/www/liste
git clone git@github-presence:rsekoua/listePresence.git .

cd backend
cp ../deploy/.env.prod.example .env
chmod 600 .env          # ⚠️ obligatoire : deploy.sh refuse de tourner sinon
nano .env               # renseigner les 3 secrets + le mot de passe PostgreSQL
```

Générer chaque secret séparément :
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

`DJANGO_SECRET_KEY` et `JWT_SECRET` doivent être **différents** : l'application
refuse de démarrer sans `JWT_SECRET`, précisément pour éviter que la fuite d'un
seul secret ne donne à la fois les sessions et le pouvoir de forger des jetons.

## 5. Premier déploiement (manuel)

```bash
cd /var/www/liste/backend
uv sync --no-dev
.venv/bin/python manage.py migrate
.venv/bin/python manage.py createcachetable   # requis : compteurs anti-bruteforce partagés
.venv/bin/python manage.py collectstatic --noinput
.venv/bin/python manage.py createsuperuser

cd ../frontend-v2 && npm ci && npm run build   # sort dans backend/frontend_dist

# Photos de CNI : lisibles par l'application seule.
mkdir -p ../backend/media && chmod 700 ../backend/media
exit                                            # quitter le shell `presence`
```

## 6. Service Gunicorn

```bash
cd /var/www/liste
sudo cp deploy/presence.socket deploy/presence.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now presence.socket presence.service
sudo systemctl status presence
```

Vérifier le bac à sable (score attendu : « OK »/« MEDIUM », pas « UNSAFE ») :
```bash
systemd-analyze security presence
```

## 7. Nginx et HTTPS

```bash
sudo cp deploy/nginx-security-headers.conf \
        /etc/nginx/snippets/presence-security-headers.conf
sudo cp deploy/nginx.conf /etc/nginx/sites-available/liste.rsekoua.org
sudo ln -sf /etc/nginx/sites-available/liste.rsekoua.org /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default    # le vhost par défaut sert /var/www/html
```

Masquer la version de Nginx dans les en-têtes et les pages d'erreur — dans
`/etc/nginx/nginx.conf`, bloc `http` :
```
server_tokens off;
```

Le vhost référence des certificats qui n'existent pas encore : obtenez-les
d'abord via le challenge webroot, servi par le bloc HTTP (port 80).

```bash
sudo apt install -y certbot
# 1. Activer temporairement le seul bloc HTTP pour le challenge :
sudo nginx -t && sudo systemctl reload nginx || \
  echo "Normal si les certificats manquent — voir la note ci-dessous."
sudo certbot certonly --webroot -w /var/www/certbot -d liste.rsekoua.org \
     --agree-tos -m rogersekoua@gmail.com --no-eff-email
sudo nginx -t && sudo systemctl reload nginx
```

> **Si `nginx -t` échoue avant l'obtention du certificat** : commentez
> temporairement le bloc `server { listen 443 … }` du vhost, rechargez,
> lancez certbot, puis décommentez et rechargez.

Renouvellement automatique (le timer `certbot.timer` est activé par le paquet) —
ajouter le rechargement de Nginx après renouvellement :

```bash
echo -e '#!/bin/sh\nsystemctl reload nginx' | \
  sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo certbot renew --dry-run
```

**Allowlist de l'admin** — ouvrez le vhost et décommentez le bloc `allow`/`deny`
du `location ^~ /gestion-interne/` avec votre IP fixe. Sans IP fixe, mettez
`DJANGO_ADMIN_URL=` (vide) dans le `.env` : l'admin disparaît complètement et
toute l'administration passe par l'interface React, qui est limitée en débit.

## 8. Sudo restreint pour le déploiement automatique

`deploy.sh` redémarre Gunicorn. Autoriser **cette seule commande** sans mot de
passe (`sudo visudo -f /etc/sudoers.d/presence`) :

```
presence ALL=(root) NOPASSWD: /usr/bin/systemctl restart presence
```

> Ne jamais mettre `NOPASSWD: ALL` : une clé de déploiement compromise
> deviendrait un accès root. Ici, elle ne permet que de redémarrer un service.

## 9. Activer le déploiement continu

GitHub → repo → **Settings → Secrets and variables → Actions** :

| Secret | Valeur |
|---|---|
| `SSH_HOST` | IP ou nom d'hôte du VPS |
| `SSH_USER` | `presence` |
| `SSH_PRIVATE_KEY` | clé **privée** de l'étape 3b |
| `SSH_PORT` | (facultatif) port SSH si différent de 22 |
| `SSH_HOST_FINGERPRINT` | empreinte de la clé d'hôte — voir ci-dessous |

L'empreinte n'est pas facultative en pratique : sans elle, l'action accepte
n'importe quelle clé d'hôte, et un détournement DNS suffirait à capturer la clé
privée de déploiement au push suivant.

```bash
ssh-keyscan -t ed25519 liste.rsekoua.org | ssh-keygen -lf - -E sha256
# → copier la partie « SHA256:xxxxx… » dans le secret
```

Enfin, **Settings → Environments → New environment → `production`** : y placer
les secrets, et cocher *Required reviewers* pour exiger une validation manuelle
avant chaque mise en production.

## 10. Vérification

```bash
curl -sI https://liste.rsekoua.org/ | grep -iE 'strict-transport|content-security|x-frame'
curl -s  https://liste.rsekoua.org/api/health          # → {"status": "ok"}
curl -sI https://liste.rsekoua.org/media/cni/          # → 404 (jamais servi)
sudo journalctl -u presence -f
```

- `https://liste.rsekoua.org/` → application React
- `https://liste.rsekoua.org/gestion-interne/` → admin Django (depuis une IP autorisée)
- Onglet **Actions** du dépôt : suivi des jobs `test` et `deploy`

Audit externe recommandé une fois en ligne : [SSL Labs](https://www.ssllabs.com/ssltest/)
(note A attendue) et [securityheaders.com](https://securityheaders.com).

## 11. Sauvegardes

```bash
sudo cp deploy/backup.sh /usr/local/bin/presence-backup.sh
sudo chmod 700 /usr/local/bin/presence-backup.sh
sudo crontab -e
```
```
0 2 * * * /usr/local/bin/presence-backup.sh >> /var/log/presence-backup.log 2>&1
```

Le script dépose les dumps dans `/var/backups/presence` en mode `700`. Ces
archives contiennent la base **et** les photos de CNI : c'est la copie la plus
sensible du système. Si vous les répliquez hors du VPS, chiffrez-les
(`age`, `gpg`) avant l'envoi.

## Mises à jour

Automatiques (push sur `main`). Manuellement :
```bash
sudo -u presence bash /var/www/liste/deploy/deploy.sh
```

## Rollback

`deploy.sh` restaure automatiquement le commit précédent si l'application ne
répond pas après redémarrage. Manuellement :

```bash
sudo -u presence -H bash
cd /var/www/liste
git checkout "$(cat deploy/.last_deploy_sha)"
bash deploy/deploy.sh
```

⚠️ Les **migrations de base ne sont pas annulées** (Django ne sait pas les
inverser de façon fiable). Si l'échec vient d'une migration destructrice,
restaurer le dernier dump :

```bash
sudo -u postgres pg_restore --clean --if-exists --no-owner --dbname=presence \
     /var/backups/presence/db_AAAAMMJJ_HHMMSS.dump
```

---

## Sécurité — décisions structurantes

Ce que le déploiement protège, et comment. À relire avant toute modification de
`nginx.conf`, du `.env` ou du service systemd.

**Les photos de CNI ne sont jamais servies depuis le disque.** Ni Nginx
(`location /media/` → 404), ni Django hors DEBUG. Elles ne sortent que par
`/api/activites/…/photo/…`, derrière un JWT, avec `Cache-Control: no-store`
pour qu'aucun cache intermédiaire n'en garde de copie. Le dossier `media/` est
en `700` : les autres comptes du serveur ne peuvent pas le lire.
**Ne jamais ajouter de `location /media/` au vhost.**

**Aucun port TCP applicatif.** Gunicorn écoute sur une socket Unix accessible au
seul groupe `www-data`. Un service compromis sur le VPS ne peut donc pas parler
à Django en contournant Nginx — donc pas contourner la limitation de débit, les
en-têtes de sécurité, ni l'allowlist d'IP de l'admin.

**Limitation de débit à deux étages.** Nginx arrête le gros du flot (10 req/min
sur la connexion) ; l'application compte plus finement (par IP *et* par compte
visé pour la connexion, par IP *et* par activité pour le pré-remplissage). Les
compteurs applicatifs vivent dans la table de cache PostgreSQL, donc partagés entre
les trois workers Gunicorn — d'où le `createcachetable` obligatoire.

**Le pré-remplissage par n° de CNI est le point d'exposition principal.**
`GET /api/public/activite/{token}/personne/{cni}` renvoie nom, prénom,
structure, téléphone et email à qui présente un numéro de CNI valide et un token
d'activité ouverte. Les numéros ivoiriens ayant une structure régulière, ce
point d'accès est énumérable par nature. Il est plafonné à 8 requêtes / 5 min
par (IP, activité) et chaque consultation aboutie est tracée dans le journal
d'audit. Si vous relevez `PREFILL_RATELIMIT`, mesurez ce que cela ouvre.

**Les JWT vivent dans le `localStorage` du navigateur** (`frontend-v2/src/api/client.ts`).
C'est le compromis retenu par l'application, mais il implique qu'un XSS
réussi = vol de session. La CSP du vhost (`script-src 'self'`, pas de
`unsafe-inline` sur les scripts, `form-action 'self'`) est ce qui rend cet XSS
difficile à exploiter : **ne l'assouplissez pas** pour faire passer un script
tiers ou une balise d'analytics.

**L'admin Django est la surface la plus exposée** : connexion par session, sans
la limitation applicative qui protège `/api/auth/login`. Trois lignes de défense
cumulables — chemin non standard (`DJANGO_ADMIN_URL`), allowlist d'IP Nginx,
ou suppression pure et simple (`DJANGO_ADMIN_URL=` vide). Le chemin non standard
seul ne suffit pas.

**Le notebook `import_participants.ipynb` ne doit jamais être committé avec ses
sorties** : elles contiennent des noms, emails et numéros de CNI réels, et
l'historique git est définitif. Un hook empêche la récidive :

```bash
git config core.hooksPath .githooks
```

**Journaux** : `backend/logs/app.log` (rotation 5 × 5 Mo) et journald
(`journalctl -u presence`). Ne pas laisser `DJANGO_LOG_SQL=DEBUG` en place — les
requêtes journalisées contiennent des données personnelles en clair.
