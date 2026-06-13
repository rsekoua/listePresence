# Déploiement sur o2switch (mutualisé) — Liste de Présence

Guide complet et pédagogique pour héberger l'application (backend **Django + Django Ninja**,
frontend **React/Vite**) sur un hébergement **mutualisé o2switch**, avec **MySQL/MariaDB**
et déploiement depuis **GitHub via Git**.

> ⚠️ Ce document **remplace** l'approche VPS (`deploy/README.md`, `gunicorn.service`, `nginx.conf`)
> pour le cas o2switch. Sur un mutualisé on n'est pas root : pas de systemd, pas de nginx à soi,
> pas de gunicorn en service. C'est **LiteSpeed + Phusion Passenger** qui font tourner l'app.

---

## 0. Architecture cible (mono-origine, recommandée)

```
            Internet (HTTPS via AutoSSL o2switch)
                          │
                     LiteSpeed
                          │
                   Phusion Passenger
                          │
          ┌───────────────────────────────────┐
          │     Application Django (unique)    │
          │  /api/...  → django-ninja          │
          │  /admin    → admin Django          │
          │  /         → SPA React (WhiteNoise) │
          │  /assets/… → fichiers React        │
          └────────────────┬──────────────────┘
                           │
                    MySQL (MariaDB) o2switch
```

**Pourquoi tout dans une seule application ?** Le frontend appelle l'API en **relatif**
(`/api`, `/media`). En servant le build React *depuis* Django (même origine), tout fonctionne
**sans CORS** (principale source d'erreurs sur mutualisé) et **sans modifier le code front**.

> *Alternative possible :* React sur le domaine + API sur `api.domaine.fr` (séparation nette,
> mais impose CORS + une variable d'env côté front). Le présent guide décrit l'option mono-origine.

---

## 1. À VÉRIFIER avant de commencer (sinon blocage)

| # | Dans cPanel | Pourquoi c'est critique |
|---|---|---|
| 1 | **Setup Python App** → *Create Application* → version max du menu **Python version** | Django 6 exige **Python ≥ 3.12**. o2switch fournit 3.12/3.13. |
| 2 | **MySQL® Databases** présent | Création base + utilisateur. |
| 3 | **SSH Access** activé (clé) | Lancer `migrate`, `collectstatic`, et l'auth Git. |

> **Risque n°1 — version Python sous Passenger.** Les binaires 3.12/3.13 existent
> (`/opt/alt/python312`, `python313`), mais si le menu *Setup Python App* plafonne à 3.11 :
> - soit demander au support o2switch d'activer 3.12+ pour Passenger ;
> - soit **rétrograder Django en 5.2 LTS** (compatible Python 3.10–3.13, support jusqu'en 2028).
>   django-ninja et tout le code fonctionnent en 5.2 — repli sûr.

---

## 2. Préparer le CODE (modifs dans le repo, à committer)

> ✅ **Déjà fait dans le repo** : `pyproject.toml` (Python ≥ 3.12), pilote MySQL
> (PyMySQL + shim dans `config/__init__.py`, `OPTIONS utf8mb4`), WhiteNoise +
> route SPA attrape-tout (`settings.py`/`urls.py`), `backend/requirements.txt`,
> `passenger_wsgi.py`, `.cpanel.yml`, et le build React dans
> `backend/frontend_dist/`. Les sous-sections ci-dessous documentent ces choix ;
> il te reste surtout à créer le `.env` (§6) et à adapter `.cpanel.yml`
> (TONUSER + version Python).

### 2.1 Assouplir la version de Python
`backend/pyproject.toml` : `requires-python = ">=3.14"` → **`">=3.12"`** (o2switch n'a pas 3.14).

### 2.2 Pilote MySQL
La config Django lit déjà `DB_ENGINE` depuis l'environnement (rien à coder côté connexion).
Ajouter le **pilote** :
- **1er choix : `mysqlclient`** (recommandé Django, le plus rapide).
- **Repli si la compilation échoue** : **`PyMySQL`** (100 % Python) + dans `backend/config/__init__.py` :
  ```python
  import pymysql
  pymysql.install_as_MySQLdb()
  ```
Et ajouter les `OPTIONS` MySQL (encodage `utf8mb4`) dans `settings.py` pour les accents/emoji.

### 2.3 Servir le React depuis Django (mono-origine)
- Ajouter **WhiteNoise** (sert le statique sans nginx).
- Copier le build React (`dist/`) dans `backend/frontend_dist/`.
- `settings.py` : WhiteNoise sert `/` et `/assets/…` ; une **route attrape-tout** renvoie
  `index.html` pour les routes SPA (`/dashboard`, `/form/:token`…) → pas de 404 au rafraîchissement.

### 2.4 Générer `requirements.txt` (Passenger ne connaît pas `uv`)
```bash
cd backend
uv export --no-hashes --format requirements-txt > requirements.txt
# y ajouter : mysqlclient (ou PyMySQL) + whitenoise
```

### 2.5 `passenger_wsgi.py` à la racine du repo (= Application Root)
```python
import os, sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

### 2.6 Construire le frontend et committer le build
Stratégie recommandée sur mutualisé : **construire en local et committer le build**
(le serveur n'a alors aucun besoin de Node) :
```bash
cd frontend-v2          # ou frontend selon la version à mettre en ligne
npm run build
cp -r dist/. ../backend/frontend_dist/
```
Retirer `frontend_dist/` du `.gitignore` pour qu'il parte sur GitHub.

> *Alternative :* construire sur le serveur via une tâche `.cpanel.yml` (`npm ci && npm run build`),
> repo plus propre mais dépend de Node sur le mutualisé (plus fragile).

---

## 3. Côté o2switch — préparation cPanel

### 3.1 Base MySQL — **MySQL® Databases**
1. **Create New Database** : `presence` (préfixée → `monuser_presence`).
2. **Add New User** : `presence` + mot de passe fort.
3. **Add User To Database** → **ALL PRIVILEGES**.
4. Noter les noms **préfixés** (`monuser_…`) : ils vont dans le `.env`.

### 3.2 Sous-domaine — **Domaines / Sous-domaines**
Créer `presence.tondomaine.fr` (crée le **dossier du domaine**, ex. `~/presence.tondomaine.fr`).

### 3.3 Application Python — **Setup Python App → Create Application**
- **Python version** : 3.13 (ou 3.12) — cf. § 1.
- **Application Root** : `presence_app` (un dossier **hors** du dossier du domaine, ex. `~/presence_app`).
- **Application URL** : `presence.tondomaine.fr`.
- **Application startup file** : `passenger_wsgi.py`.
- **Application Entry point** : `application`.

> **Pourquoi Application Root ≠ dossier du domaine ?** (consigne de sécurité o2switch)
> Le code, le `.env` et les fichiers ne doivent pas être dans le dossier public. Passenger
> relie les deux via un `.htaccess` généré automatiquement.

L'outil affiche une commande `source …/bin/activate` : la garder pour le SSH.

---

## 4. Déploiement du code via Git (GitHub → o2switch)

### Modèle mental : 2 phases
1. **Update from Remote** = `git pull` (récupère le code depuis GitHub).
2. **Deploy HEAD Commit** = exécute les tâches du fichier **`.cpanel.yml`**.

### 4.1 Authentifier le serveur auprès de GitHub (repo privé)
1. cPanel → **SSH Access → Manage SSH Keys** : récupérer la **clé publique** o2switch.
2. GitHub → repo → **Settings → Deploy keys → Add deploy key** : coller cette clé (lecture seule).
3. Cloner en **SSH** : `git@github.com:ton-user/listePresence.git`.
> Repo public = clone HTTPS direct, sans clé.

### 4.2 Cloner le dépôt **dans l'Application Root**
Le dépôt cloné **= l'Application Root** (le `passenger_wsgi.py` à la racine pointe vers `backend/`).

**Option 1 — SSH (recommandée pour démarrer) :**
```bash
ssh tonuser@tondomaine.fr
git clone git@github.com:ton-user/listePresence.git ~/presence_app
```
**Option 2 — cPanel Git Version Control :** *Create → Clone a Repository* → URL SSH →
**Repository Path** = `~/presence_app`. Puis pointer l'**Application Root** dessus.

### 4.3 Auto-déploiement avec `.cpanel.yml` (Option 2)
Fichier **`.cpanel.yml` à la racine du repo** (commité) :
```yaml
---
deployment:
  tasks:
    - export VENV=/home/TONUSER/virtualenv/presence_app/3.13/bin/activate
    - source $VENV && cd /home/TONUSER/presence_app/backend && pip install -r requirements.txt
    - source $VENV && cd /home/TONUSER/presence_app/backend && python manage.py migrate --noinput
    - source $VENV && cd /home/TONUSER/presence_app/backend && python manage.py collectstatic --noinput
    - /bin/touch /home/TONUSER/presence_app/tmp/restart.txt
```
> ⚠️ **Contrainte o2switch :** le *Deploy* exige un **arbre de travail propre** (`git status`
> sans modification de fichier **suivi**). Donc **ne jamais éditer un fichier suivi sur le serveur**.
> Le `.env` est dans `.gitignore` → « non suivi » → ne casse pas l'arbre propre. ✅

### Quelle option choisir ?
| | Option 1 — SSH manuel | Option 2 — cPanel Git + `.cpanel.yml` |
|---|---|---|
| Récupérer le code | `git pull` en SSH | bouton **Update from Remote** |
| migrate/collectstatic/restart | toi, en SSH | automatique (tâches) |
| Avantage | contrôle total, pédagogique | un clic |
| Démarrer par… | ✅ celle-ci | une fois que tout marche |

---

## 5. Installer et initialiser (SSH)

```bash
# 1) Activer le virtualenv (commande fournie par Setup Python App)
source ~/virtualenv/presence_app/3.13/bin/activate     # exemple

# 2) Créer le .env (une seule fois) — voir § 6
nano ~/presence_app/backend/.env

# 3) Dépendances
cd ~/presence_app/backend
pip install -r requirements.txt

# 4) Base de données
python manage.py migrate

# 4 bis) Table de cache (rate-limiting partagé entre processus)
python manage.py createcachetable

# 5) Fichiers statiques (admin + WhiteNoise)
python manage.py collectstatic --noinput

# 6) Compte administrateur
python manage.py createsuperuser

# 7) Vérifier la config de prod
python manage.py check --deploy
```

**Redémarrer l'application** (obligatoire après chaque changement de code) :
bouton **Restart** dans *Setup Python App*, ou en SSH :
```bash
mkdir -p ~/presence_app/tmp && touch ~/presence_app/tmp/restart.txt
```

---

## 6. Fichier `.env` de production (MySQL)

À créer dans `backend/.env` **sur le serveur** (jamais commité) :
```ini
# Clé : python -c "import secrets; print(secrets.token_urlsafe(50))"
DJANGO_SECRET_KEY=__clé_unique__
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=presence.tondomaine.fr
DJANGO_CSRF_TRUSTED_ORIGINS=https://presence.tondomaine.fr
PUBLIC_FORM_BASE_URL=https://presence.tondomaine.fr
JWT_SECRET=__autre_clé__
JWT_ACCESS_LIFETIME_HOURS=8
JWT_REFRESH_LIFETIME_DAYS=7

# Proxy de confiance (LiteSpeed/Passenger) : nécessaire pour obtenir la VRAIE IP
# cliente — utilisée par le journal d'audit ET par le rate-limiting par IP.
# ⚠️ À VÉRIFIER après le 1er déploiement : connecte-toi, puis regarde l'IP dans
# le journal d'audit (page Journal, ou table accounts_auditlog).
#   - IP fausse / identique pour tous (ex. 127.0.0.1) → DJANGO_TRUST_PROXY=True
#   - IP cliente déjà correcte                        → laisser False
# (Si toutes les requêtes partagent une seule IP, le rate-limiting login/public
#  se déclenche pour tout le monde à la fois → d'où l'importance de ce réglage.)
DJANGO_TRUST_PROXY=True

# Anti-spam du formulaire public : défaut 60 soumissions / 5 min PAR IP.
# À augmenter pour un gros événement derrière un Wi-Fi/4G partagé (même IP).
# PUBLIC_RATELIMIT=120
# PUBLIC_RATELIMIT_WINDOW=300

# Base MySQL o2switch (noms PRÉFIXÉS)
DB_ENGINE=django.db.backends.mysql
DB_NAME=monuser_presence
DB_USER=monuser_presence
DB_PASSWORD=__mot_de_passe_db__
DB_HOST=localhost
DB_PORT=3306
```

---

## 7. HTTPS et vérifications finales

1. **HTTPS** : o2switch installe un certificat **AutoSSL (Let's Encrypt)** automatiquement
   (sinon cPanel → *SSL/TLS Status* → *Run AutoSSL*). `settings.py` force HTTPS/HSTS quand `DEBUG=False`. ✅
2. **Checklist :**
   - `https://presence.tondomaine.fr/api/health` → `{"status":"ok"}`
   - Connexion + login OK.
   - Création d'activité → le **QR code** encode `https://presence.tondomaine.fr/form/...`
     (grâce à `PUBLIC_FORM_BASE_URL`).
   - Formulaire public + **upload photo CNI** (vérifier l'écriture dans `backend/media/`).
   - Un **export** Excel/PDF se télécharge.

---

## 8. Mises à jour (le quotidien)

**Chez toi :**
```bash
# coder…
cd frontend-v2 && npm run build && cp -r dist/. ../backend/frontend_dist/   # si le front a changé
git add -A && git commit -m "..." && git push
```

**Sur le serveur :**
- **Option 1 (SSH) :**
  ```bash
  cd ~/presence_app && git pull
  source <venv>/bin/activate && cd backend
  pip install -r requirements.txt        # si requirements changé
  python manage.py migrate               # si nouvelle migration
  python manage.py collectstatic --noinput
  touch ~/presence_app/tmp/restart.txt
  ```
- **Option 2 (cPanel) :** **Update from Remote** → **Deploy HEAD Commit**.

---

## 9. Sauvegardes

- **Base :** `mysqldump -u monuser_presence -p monuser_presence > sauvegarde.sql`
  (planifiable via *Cron Jobs* cPanel).
- **Photos CNI :** sauvegarde du dossier `backend/media/`.
- o2switch fait aussi des sauvegardes (JetBackup), mais garder les tiennes.

---

## 10. Dépannage rapide

| Symptôme | Piste |
|---|---|
| **Erreur 500** au chargement | Activer le debug Passenger dans le `.htaccess` du dossier domaine : `PassengerAppEnv development` + `PassengerFriendlyErrorPages on`, recharger, **puis désactiver**. |
| Page blanche / 404 sur `/dashboard` au refresh | Vérifier la route attrape-tout (§ 2.3) qui renvoie `index.html`. |
| `Access denied` MySQL | Identifiants **préfixés** (`monuser_…`), `DB_HOST=localhost`. |
| Statiques admin cassés | `collectstatic` non lancé / WhiteNoise mal configuré. |
| Modif de code sans effet | `touch tmp/restart.txt` oublié. |
| *Deploy* cPanel refusé | Arbre de travail non propre : un fichier **suivi** a été modifié sur le serveur. |

---

## Récapitulatif des fichiers à ajouter au repo
- `backend/requirements.txt` (export uv + mysqlclient/PyMySQL + whitenoise)
- `passenger_wsgi.py` (racine du repo)
- `.cpanel.yml` (racine du repo, si Option 2)
- `backend/frontend_dist/` (build React committé)
- Modifs : `pyproject.toml` (Python ≥ 3.12), `settings.py` (OPTIONS MySQL + WhiteNoise + route SPA),
  éventuellement `config/__init__.py` (PyMySQL)
- **Jamais** : `backend/.env` (créé à la main sur le serveur)

---

## Sources o2switch
- [Déployer une application Python sur o2switch](https://faq.o2switch.fr/cpanel/logiciels/hebergement-python-multi-version/)
- [Langages supportés (PHP, Node, Ruby, Python)](https://faq.o2switch.fr/guides/langages-supportes-php-node-ruby-python/)
- [Git Version Control — FAQ o2switch](https://faq.o2switch.fr/cpanel/fichiers/gitweb/)
- [Les outils du bloc « Logiciel » du cPanel o2switch](https://blog.o2switch.fr/comprendre-les-outils-du-bloc-logiciel-du-cpanel-o2switch/)
