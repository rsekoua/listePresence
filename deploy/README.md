# Déploiement — Gestion de Présence

Pile : **Django (Gunicorn) + React (build statique) + Nginx**, sur Ubuntu 22.04.

Ce dossier fournit des modèles à adapter :

| Fichier | Rôle |
|---|---|
| `nginx.conf` | Reverse proxy : sert le front statique + proxie `/api`, `/admin`, `/static` |
| `gunicorn.service` | Service systemd lançant Gunicorn (WSGI Django) |
| `deploy.sh` | Script de mise à jour (git pull → migrate → collectstatic → build front → restart) |
| `.env.prod.example` | Variables d'environnement de production (à copier en `backend/.env`) |

## 1. Pré-requis serveur
```bash
sudo apt update && sudo apt install -y nginx python3 python3-venv nodejs npm
# uv (gestionnaire de paquets Python) — voir https://docs.astral.sh/uv/
```

## 2. Récupération + configuration
```bash
sudo mkdir -p /var/www/presence && sudo chown $USER /var/www/presence
git clone <repo> /var/www/presence
cd /var/www/presence/backend
cp ../deploy/.env.prod.example .env   # puis éditer les secrets
uv sync --no-dev
uv add gunicorn                       # serveur WSGI de production
```

## 3. Base de données (PostgreSQL)
⚠️ **Important** : `config/settings.py` utilise **SQLite par défaut** (MVP/dev). Pour la
production, le cahier des charges prévoit **PostgreSQL 16**. Installe-le puis adapte
`DATABASES` (par ex. via variables d'environnement) :
```bash
sudo apt install -y postgresql
sudo -u postgres createdb presence
sudo -u postgres createuser presence --pwprompt
```
```python
# config/settings.py (bloc DATABASES en prod)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "presence"),
        "USER": os.getenv("DB_USER", "presence"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "127.0.0.1"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}
```
(ne pas oublier `uv add psycopg[binary]`).

## 4. Premier déploiement
```bash
cd /var/www/presence/backend
.venv/bin/python manage.py migrate
.venv/bin/python manage.py createsuperuser   # compte admin initial
.venv/bin/python manage.py collectstatic --noinput

cd ../frontend && npm ci && npm run build
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
sudo certbot --nginx -d domaine.com
```

## 7. Mises à jour suivantes
```bash
bash deploy/deploy.sh
```

## Notes
- Les **photos CNI** ne sont jamais servies publiquement (`/media` non exposé) : elles
  transitent uniquement par l'API authentifiée. Ne pas ajouter de `location /media/`.
- Les **logs** applicatifs sont écrits dans `backend/logs/app.log` (rotation 5×5 Mo) et
  sur la sortie standard (récupérée par journald via systemd : `journalctl -u presence`).
- Sauvegardes (pg_dump + media) : à planifier via cron — non couvert ici.
