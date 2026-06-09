# CAHIER DES CHARGES

## Système Web de Gestion de Présence aux Activités
### Collecte par QR Code · Numérisation des CNI · Exports Excel & PDF

---

| | |
|---|---|
| **Référence du document** | CDC-GPA-2026-001 |
| **Version** | 2.0 |
| **Date** | Juin 2026 |
| **Statut** | Dossier de consultation des entreprises (DCE) |
| **Nature** | Cahier des Clauses Techniques Particulières (CCTP) |
| **Type de marché** | Conception, réalisation, déploiement et maintenance d'une application web |
| **Domaine** | Systèmes d'information — Collecte et gestion de données événementielles |

---

## SOMMAIRE

1. [Objet de la consultation](#1-objet-de-la-consultation)
2. [Présentation du contexte et des enjeux](#2-présentation-du-contexte-et-des-enjeux)
3. [Périmètre et description générale du système](#3-périmètre-et-description-générale-du-système)
4. [Acteurs, rôles et habilitations (RBAC)](#4-acteurs-rôles-et-habilitations-rbac)
5. [Exigences fonctionnelles détaillées](#5-exigences-fonctionnelles-détaillées)
6. [Exigences non fonctionnelles](#6-exigences-non-fonctionnelles)
7. [Architecture technique](#7-architecture-technique)
8. [Modèle de données](#8-modèle-de-données)
9. [Interfaces de programmation (API)](#9-interfaces-de-programmation-api)
10. [Livrables attendus](#10-livrables-attendus)
11. [Conditions de réalisation et planning](#11-conditions-de-réalisation-et-planning)
12. [Recette, réception et garantie](#12-recette-réception-et-garantie)
13. [Cadre de réponse et critères de sélection](#13-cadre-de-réponse-et-critères-de-sélection)
14. [Annexes](#14-annexes)

---

## 1. Objet de la consultation

### 1.1 Objet

Le présent cahier des charges a pour objet de définir les besoins fonctionnels,
techniques et de service relatifs à la **conception, la réalisation, le
déploiement et la maintenance d'une application web de gestion de la présence
aux activités institutionnelles** (formations, ateliers, réunions, séminaires).

L'application doit permettre de **numériser intégralement** le processus de
collecte des informations de présence des participants, depuis l'enregistrement
sur le terrain (via un formulaire mobile accessible par QR Code, incluant la
capture des justificatifs d'identité) jusqu'à l'exploitation des données
(tableau de bord, annuaire et génération de documents officiels).

### 1.2 Forme de la consultation

La consultation porte sur une prestation globale incluant :

- la **fourniture d'une solution logicielle** complète (back-office d'administration + formulaire public) ;
- son **installation et sa mise en production** sur l'infrastructure du maître d'ouvrage ;
- le **transfert de compétences** et la documentation associée ;
- une **prestation de maintenance** corrective et évolutive (TMA).

Le soumissionnaire répond à l'intégralité du périmètre. Les variantes sont
admises et doivent être clairement identifiées (cf. § 13).

### 1.3 Documents contractuels

En cas de contradiction, l'ordre de priorité est le suivant :

1. L'acte d'engagement et ses annexes financières ;
2. Le présent CCTP (CDC-GPA-2026-001 v2.0) ;
3. La proposition technique du titulaire ;
4. La documentation des composants tiers (open source).

---

## 2. Présentation du contexte et des enjeux

### 2.1 Origine du besoin

Dans le cadre de l'organisation d'activités institutionnelles, la collecte
manuelle (papier) des informations de présence présente des limites
récurrentes :

- **lenteur** du processus d'émargement aux entrées ;
- **erreurs et illisibilité** de la saisie manuscrite ;
- **données incomplètes** et difficilement exploitables ;
- **difficultés d'archivage**, de recherche et de consolidation ;
- **absence de justificatif d'identité** fiable rattaché à la présence.

### 2.2 Objectifs généraux

- **Numériser** la collecte de présence via un formulaire web mobile accessible par QR Code, sans installation d'application ;
- **Sécuriser et centraliser** les données des participants, activité par activité, avec capture des cartes nationales d'identité (CNI) recto/verso ;
- **Automatiser** la production des documents de sortie (listes Excel, fiches CNI PDF, listes de présence à signer, archives ZIP) ;
- **Piloter** l'activité en temps réel via un tableau de bord et un annuaire transverse des personnes ;
- **Tracer** l'ensemble des actions sensibles (journal d'audit) à des fins de conformité.

### 2.3 Bénéfices attendus

| Indicateur | Situation actuelle (papier) | Cible (solution) |
|---|---|---|
| Temps d'enregistrement d'un participant | 2–3 min | < 60 s (auto-saisie) |
| Taux d'erreur de saisie | Élevé | Quasi nul (validation serveur) |
| Production d'une liste de présence | Manuelle, plusieurs heures | Immédiate (export à la demande) |
| Justificatif d'identité | Absent / photocopie | Photo CNI recto-verso normalisée |
| Recherche d'un participant historique | Impossible | Annuaire dédupliqué par CNI |

### 2.4 Contexte d'usage local

La solution est destinée à un usage en **Côte d'Ivoire** : interface en langue
française, fuseau horaire `Africa/Abidjan`, validation des numéros de téléphone
au format ivoirien (`+225` suivi de 10 chiffres), et prise en compte de
conditions de connectivité mobile variables sur les lieux d'activité.

---

## 3. Périmètre et description générale du système

### 3.1 Vue d'ensemble

La solution se compose de deux interfaces complémentaires reposant sur une même
API :

1. **Le back-office (espace organisateur/administrateur)** — application web
   monopage (SPA) sécurisée par authentification, permettant la gestion des
   activités, des participants, des comptes, des exports et du pilotage.
2. **Le formulaire public (espace participant)** — interface web mobile-first
   accessible **sans authentification** via un QR Code, permettant à un
   participant de s'enregistrer et de téléverser ses photos de CNI.

### 3.2 Découpage fonctionnel (modules)

| Module | Intitulé | Préfixe exigences |
|---|---|---|
| Module 1 | Authentification, comptes & habilitations | AUTH |
| Module 2 | Gestion des activités | ACT |
| Module 3 | Formulaire de collecte public | FORM |
| Module 4 | Traitement et sécurisation des photos CNI | IMG |
| Module 5 | Exports et génération de documents | EXP |
| Module 6 | Tableau de bord, annuaire & pilotage | DASH |
| Module 7 | Journal d'audit & traçabilité | AUD |

### 3.3 Exclusions du périmètre (hors marché)

Sauf chiffrage explicite en variante, sont **hors périmètre** : la fourniture du
matériel serveur, l'envoi d'e-mails/SMS transactionnels, les passerelles de
paiement, la reconnaissance optique (OCR) automatique des CNI et la
reconnaissance faciale. Ces éléments pourront faire l'objet d'évolutions
ultérieures (cf. § 14.3).

---

## 4. Acteurs, rôles et habilitations (RBAC)

### 4.1 Acteurs

| Acteur | Description | Mode d'accès |
|---|---|---|
| **Administrateur** | Supervise l'ensemble du système, gère les comptes et consulte le journal d'audit | Back-office (authentifié) |
| **Organisateur** | Crée et gère ses propres activités et participants | Back-office (authentifié) |
| **Participant** | S'enregistre à une activité | Formulaire public (token QR) |
| **Administrateur technique** | Déploie, sauvegarde et maintient | SSH + interface d'administration |

### 4.2 Matrice des habilitations (RBAC)

Le contrôle d'accès basé sur les rôles est **vérifié systématiquement côté
serveur**. Deux rôles sont définis : `admin` et `organisateur`.

| Action | Administrateur | Organisateur |
|---|:---:|:---:|
| Voir **toutes** les activités | ✅ | ❌ (seulement les siennes) |
| Créer une activité | ✅ | ✅ |
| Modifier / supprimer une activité | ✅ (toutes) | ✅ (les siennes, **si statut OUVERT**) |
| Changer le statut d'une activité | ✅ (toutes) | ✅ (les siennes, si OUVERT) |
| Cloner une activité | ✅ | ✅ (la copie lui appartient) |
| Voir les participants | ✅ (tous) | ✅ (de ses activités) |
| Annuaire des personnes | ✅ (global) | ✅ (limité à ses participants) |
| Générer des exports | ✅ (toutes activités) | ✅ (ses activités) |
| Gérer les comptes utilisateurs | ✅ | ❌ |
| Consulter le journal d'audit | ✅ | ❌ |

> **Règle de confidentialité.** Lorsqu'un organisateur tente d'accéder à une
> ressource d'autrui, le système répond `404 Introuvable` (et non `403`) afin de
> ne pas révéler l'existence de la ressource.

> **Règle de verrouillage.** Une activité passée en statut **Fermée** ou
> **Archivée** est verrouillée en écriture pour son organisateur ; seul un
> administrateur peut encore la modifier.

---

## 5. Exigences fonctionnelles détaillées

> **Légende des priorités** : `H` = Haute (indispensable au MVP), `M` = Moyenne,
> `B` = Basse. Toutes les exigences listées ci-dessous sont **attendues en
> fonctionnement nominal** et font partie du socle à livrer.

### Module 1 — Authentification, comptes & habilitations

| ID | Exigence | Priorité |
|---|---|:---:|
| **AUTH-01** | **Connexion.** L'utilisateur s'authentifie par identifiant + mot de passe. Le système délivre un **jeton d'accès JWT** (durée de vie 8 h) et un **jeton de rafraîchissement** (7 jours). Les jetons sont stockés côté client. | H |
| **AUTH-02** | **Session & expiration.** À l'expiration du jeton d'accès, le client le renouvelle silencieusement via le jeton de rafraîchissement ; à défaut, l'utilisateur est redirigé vers la page de connexion. Les durées sont configurables par variable d'environnement. | H |
| **AUTH-03** | **Déconnexion.** L'utilisateur peut se déconnecter manuellement (purge des jetons côté client + journalisation côté serveur). | H |
| **AUTH-04** | **Profil courant.** Un point d'accès retourne les informations de l'utilisateur connecté (identifiant, email, rôle). | H |
| **AUTH-05** | **Changement de mot de passe.** L'utilisateur connecté peut changer son mot de passe (vérification de l'ancien, longueur minimale 8 caractères). | M |
| **AUTH-06** | **Gestion des comptes (admin).** L'administrateur crée, liste, modifie (nom, email, rôle, activation) et supprime des comptes. Unicité de l'identifiant et de l'email garantie. | M |
| **AUTH-07** | **Réinitialisation de mot de passe (admin).** L'administrateur peut réinitialiser le mot de passe d'un compte. | M |
| **AUTH-08** | **Garde-fous d'intégrité.** Un administrateur ne peut ni se retirer son propre rôle admin, ni désactiver/supprimer son propre compte. Un compte ayant créé des activités ne peut être supprimé (désactivation imposée pour préserver les données liées). | H |
| **AUTH-09** | **Mots de passe.** Stockage haché (algorithme géré par le socle Django), avec validateurs de robustesse (similarité, longueur minimale, mots de passe courants, numériques). | H |

### Module 2 — Gestion des activités

| ID | Exigence | Priorité |
|---|---|:---:|
| **ACT-01** | **Création d'une activité** avec les attributs : nom, description, date/heure de début, date/heure de fin, ville, lieu. La date de fin doit être postérieure à la date de début (validation serveur). | H |
| **ACT-02** | **Génération du QR Code.** À la création, un **token UUID opaque** unique est généré et un QR Code PNG encodant l'URL du formulaire public est mis à disposition (téléchargeable / imprimable). | H |
| **ACT-03** | **Consultation & liste.** Liste des activités filtrée selon le rôle (cf. RBAC), avec compteur de participants et indicateur de droits d'édition par ligne. | H |
| **ACT-04** | **Modification.** Mise à jour des attributs d'une activité par le créateur ou un administrateur. Le token QR reste **inchangé** lors d'une modification. | H |
| **ACT-05** | **Statut de collecte.** Une activité peut être **Ouverte**, **Fermée** ou **Archivée**. La fermeture interdit toute nouvelle soumission au formulaire public. | H |
| **ACT-06** | **Suppression.** Suppression d'une activité par le créateur ou un administrateur, **refusée si l'activité contient des participants** (archivage imposé). | M |
| **ACT-07** | **Clonage.** Duplication d'une activité (hors participants), la copie étant créée en statut Ouvert et rattachée à l'utilisateur qui clone. | B |
| **ACT-08** | **Affiche QR Code (PDF).** Génération d'une affiche PDF prête à imprimer (informations de l'activité + QR Code). | M |

### Module 3 — Formulaire de collecte public (participant)

| ID | Exigence | Priorité |
|---|---|:---:|
| **FORM-01** | **Accès par token.** Le formulaire est accessible sans authentification via l'URL `/form/{token}`. Le système vérifie la validité du token et affiche les informations publiques de l'activité (nom, ville, lieu, dates, statut). | H |
| **FORM-02** | **Saisie des informations** du participant : nom, prénom, structure, fonction, téléphone (Wave), email, numéro de CNI. | H |
| **FORM-03** | **Téléversement des photos CNI** recto **et** verso (obligatoires sur le formulaire public). | H |
| **FORM-04** | **Validation des entrées (serveur).** Téléphone ivoirien normalisé au format `+225XXXXXXXXXX` ; email au format valide ; numéro de CNI non trivial ; champs texte obligatoires non vides. | H |
| **FORM-05** | **Contrôle du statut.** Toute soumission sur une activité non Ouverte est rejetée (collecte fermée). | H |
| **FORM-06** | **Anti-doublon.** Un même numéro de CNI ne peut être enregistré deux fois pour une même activité (contrainte d'unicité `(activité, numéro_cni)`) ; message explicite en cas de doublon (HTTP 409). | H |
| **FORM-07** | **Confirmation.** Retour visuel de succès après enregistrement ; interface mobile-first optimisée (éléments tactiles ≥ 48 px). | H |
| **FORM-08** | **Traçabilité.** Horodatage automatique et enregistrement de l'adresse IP de soumission. | M |
| **FORM-09** | **Ajout manuel (organisateur).** Un organisateur peut ajouter un participant depuis le back-office (sans photos CNI), avec les mêmes règles de validation et d'anti-doublon. | M |

### Module 4 — Traitement et sécurisation des photos CNI

| ID | Exigence | Priorité |
|---|---|:---:|
| **IMG-01** | **Contrôle du fichier.** Vérification du type MIME (image) et de l'intégrité du fichier ; rejet des fichiers non images ou corrompus (HTTP 422). | H |
| **IMG-02** | **Normalisation.** Recadrage au ratio carte d'identité et redimensionnement à **1010 × 638 px** (≈ 85,6 × 54 mm à 300 dpi), réencodage **JPEG qualité 85**, conversion RVB. Taille minimale acceptée : 400 × 250 px. | H |
| **IMG-03** | **Stockage sécurisé.** Photos stockées **hors de la racine web publique**, dans une arborescence structurée `cni/{année}/{activité}/{participant}/{recto\|verso}.jpg`. | H |
| **IMG-04** | **Accès protégé.** La consultation d'une photo CNI est servie **uniquement via un point d'accès authentifié (JWT)** et soumise au RBAC. Aucun accès direct par URL de fichier. | H |
| **IMG-05** | **Recadrage assisté.** Le back-office propose un outil de recadrage des photos avant enregistrement lors d'un ajout assisté. | B |

### Module 5 — Exports et génération de documents

> Tous les exports de liste partagent un **jeu de filtres commun (EXP-05)** :
> recherche plein texte (nom, prénom, email, CNI), structure, plage de dates de
> saisie, et complétude des CNI (`complète` / `incomplète`).

| ID | Exigence | Priorité |
|---|---|:---:|
| **EXP-01** | **Export Excel** (`.xlsx`) de la liste des participants d'une activité, mis en forme. | H |
| **EXP-02** | **Fiche CNI individuelle (PDF)** d'un participant (informations + photos recto/verso). | H |
| **EXP-03** | **Liste de présence à signer (PDF A4)** : tableau des participants avec colonne d'émargement. | H |
| **EXP-04** | **Archive ZIP** regroupant les fiches CNI PDF de tous les participants filtrés. | H |
| **EXP-05** | **Filtres avant export** appliqués de manière identique à tous les exports de liste (cf. encadré ci-dessus). | M |
| **EXP-06** | **Journal des exports.** Chaque export est tracé (type, nombre d'entrées, auteur, date) et consultable par activité. | B |
| **EXP-07** | **Nommage normalisé** des fichiers générés : `{activité}_{AAAAMMJJ}_{type}.{ext}`. | M |

### Module 6 — Tableau de bord, annuaire & pilotage

| ID | Exigence | Priorité |
|---|---|:---:|
| **DASH-01** | **Statistiques globales** : nombre total d'activités et nombre de **personnes uniques** (dédupliquées par numéro de CNI, sans double comptage inter-activités). | H |
| **DASH-02** | **Liste des activités** sous forme de tableau (desktop) et de cartes (mobile), avec accès au détail. | H |
| **DASH-03** | **Liste des participants** d'une activité, **paginée et filtrable** (recherche, structure, dates). | H |
| **DASH-04** | **Fiche détaillée d'un participant** (informations + visualisation des photos CNI). | H |
| **DASH-05** | **Statistiques par activité** : total, nombre de CNI complètes/incomplètes, répartition par structure (top 10). | M |
| **DASH-06** | **Annuaire transverse des personnes** dédupliqué par numéro de CNI : identité issue de la participation la plus récente, nombre d'activités, dernière participation, complétude CNI ; filtrable (recherche, structure, complétude). | M |
| **DASH-07** | **Historique d'une personne** : ensemble de ses participations (activité, lieu, date, complétude), dans la limite de visibilité du rôle. | M |

### Module 7 — Journal d'audit & traçabilité

| ID | Exigence | Priorité |
|---|---|:---:|
| **AUD-01** | **Journalisation des actions sensibles** : connexions (réussies/échouées), déconnexions, changements de mot de passe, opérations sur les activités (création, modification, statut, suppression, clonage), exports, et opérations sur les comptes (création, modification, suppression, réinitialisation). | M |
| **AUD-02** | **Contenu d'une entrée** : utilisateur, identifiant, action, objet concerné, adresse IP, date/heure. | M |
| **AUD-03** | **Consultation (admin)** : journal global filtrable par action et par recherche (500 entrées les plus récentes) ; journal par utilisateur (200 entrées). | M |

---

## 6. Exigences non fonctionnelles

### 6.1 Sécurité

| ID | Exigence |
|---|---|
| **SEC-01** | Authentification par **JWT** (algorithme HS256), durées de vie configurables (accès 8 h, rafraîchissement 7 j). Secret JWT distinct possible de la clé applicative. |
| **SEC-02** | Formulaire public sécurisé par **token UUID opaque**, sans authentification ni énumération possible. |
| **SEC-03** | **Validation et assainissement systématiques** de toutes les entrées **côté serveur** (schémas typés). |
| **SEC-04** | Photos CNI **hors racine web publique** et servies uniquement via endpoint authentifié (RBAC). |
| **SEC-05** | **Mots de passe hachés** + validateurs de robustesse. |
| **SEC-06** | **Durcissement production** (activé hors mode debug) : redirection HTTPS, **HSTS** (1 an, sous-domaines, preload), cookies `Secure` et `HttpOnly`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, en-tête proxy SSL, origines de confiance CSRF configurables. |
| **SEC-07** | **Garde-fou de démarrage** : refus de démarrer en production si la clé secrète de développement est détectée. |
| **SEC-08** | **HTTPS obligatoire** en production (certificat Let's Encrypt / Certbot). |
| **SEC-09** | Journaux d'accès et d'erreurs conservés (rotation des fichiers) ; traçabilité via journal d'audit applicatif. |

### 6.2 Performance

| Opération | Cible |
|---|---|
| Chargement du formulaire public (3G) | < 3 s |
| Génération d'une fiche CNI PDF individuelle | < 5 s |
| Génération du ZIP complet (≈ 50 participants) | < 30 s |
| Export Excel (≈ 200 participants) | < 10 s |
| Temps de réponse moyen de l'API | < 500 ms |

> Les listes de participants sont **paginées côté serveur** et les requêtes
> optimisées (jointures et agrégations préchargées) pour éviter les requêtes
> N+1.

### 6.3 Compatibilité

- **Formulaire public** : Chrome Mobile, Safari iOS, Firefox Mobile (mobile-first).
- **Back-office** : Chrome, Firefox, Edge (desktop), responsive.
- **Serveur** : Ubuntu 22.04 LTS (ou compatible Linux).

### 6.4 Accessibilité & expérience utilisateur

- Interface **entièrement en français**.
- Cibles tactiles ≥ 48 px sur le formulaire public.
- **Messages d'erreur explicites** en français.
- **Retours visuels** systématiques (chargements, succès, erreurs) via notifications.
- Tableaux de données à **hauteur adaptative** et pagination harmonisée (10 lignes par défaut ; options 10 / 25 / 50).

### 6.5 Disponibilité & sauvegarde

| ID | Exigence |
|---|---|
| **DISP-01** | Disponibilité cible : **99 %** (hors maintenance planifiée). |
| **DISP-02** | Sauvegarde **quotidienne** de la base de données (script fourni). |
| **DISP-03** | Sauvegarde **hebdomadaire** des fichiers media (photos CNI). |
| **DISP-04** | Rétention des sauvegardes : **30 jours**. |

### 6.6 Maintenabilité & qualité

| ID | Exigence |
|---|---|
| **QUAL-01** | **Couverture de tests automatisés** du back-end (objectif : ≥ 45 tests couvrant authentification, RBAC, activités, formulaire public, exports). |
| **QUAL-02** | **Typage statique** strict côté front-end (TypeScript) sans erreur de compilation. |
| **QUAL-03** | **Journalisation applicative** structurée (console + fichiers rotatifs). |
| **QUAL-04** | Code documenté, conventions de nommage cohérentes, séparation claire back/front. |
| **QUAL-05** | Configuration par **variables d'environnement** (aucun secret en dur ; base de données commutable SQLite/PostgreSQL sans modification de code). |

---

## 7. Architecture technique

### 7.1 Principes d'architecture

- Architecture **client-serveur découplée** : SPA front-end + API REST back-end.
- API **typée et auto-documentée** (spécification OpenAPI accessible).
- **Authentification sans état** (JWT), favorisant la scalabilité horizontale.
- Stockage des **médias séparé** de la base de données et de la racine web.

### 7.2 Pile technologique cible

| Couche | Technologie | Version | Rôle |
|---|---|---|---|
| Langage back-end | Python | 3.14 | Exécution serveur |
| Gestion d'environnement | uv | — | Dépendances & venv |
| Framework back-end | Django | 6.x | Structure, ORM, admin |
| API REST | Django Ninja | 1.4+ | Endpoints typés, OpenAPI |
| Authentification | PyJWT | 2.10+ | Jetons JWT (HS256) |
| Base de données | SQLite / PostgreSQL | — / 16 | Dev (SQLite) · Prod (PostgreSQL) |
| Traitement images | Pillow | 11+ | Redimensionnement, recadrage, JPEG |
| QR Code | qrcode | 8+ | Génération PNG |
| Export Excel | openpyxl | 3.1+ | Fichiers `.xlsx` |
| Export PDF | ReportLab | 4.5+ | PDF avec images |
| Serveur WSGI | Gunicorn | — | Exécution production |
| Reverse proxy | Nginx | 1.24 | Proxy, fichiers statiques, TLS |
| Front-end | React + Vite | 19 / 8 | Interface SPA |
| Langage front-end | TypeScript | 6.x | Typage statique |
| Composants UI | Material UI (MUI) + X Data Grid | 9.x | Bibliothèque de composants |
| Formulaires | React Hook Form + Zod | — | Validation typée |
| Données distantes | TanStack React Query + Axios | — | Appels API + cache |
| Routage | React Router | 7.x | Navigation SPA |

> Les versions ci-dessus reflètent le socle technique retenu ; le titulaire peut
> proposer des évolutions mineures justifiées, sans remettre en cause les
> exigences fonctionnelles et de sécurité.

### 7.3 Arborescence projet (cible)

```
listePresence/
├── backend/
│   ├── config/              # Projet Django : settings, urls, api Ninja, wsgi/asgi
│   ├── apps/
│   │   ├── accounts/        # Auth JWT, comptes (User UUID), RBAC, journal d'audit
│   │   ├── activites/       # Activités, QR Code, clonage, jeu de démo
│   │   ├── participants/    # Formulaire public, participants, annuaire
│   │   └── exports/         # Exports Excel / PDF / ZIP + historique
│   ├── media/               # Photos CNI (hors versioning)
│   ├── logs/                # Journaux applicatifs (rotatifs)
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── pages/           # Écrans (Dashboard, Activité, Annuaire, Comptes, Journal…)
│   │   ├── components/      # Composants réutilisables (dialogues, recadrage CNI…)
│   │   ├── api/             # Couche d'accès à l'API typée
│   │   ├── auth/ layout/ theme/
│   │   └── main.tsx
│   └── vite.config.ts
└── deploy/                  # Nginx, service systemd Gunicorn, scripts deploy & backup
```

### 7.4 Écrans du back-office (front-end)

| Route | Écran | Accès |
|---|---|---|
| `/login` | Connexion | Public |
| `/form/:token` | Formulaire public de collecte | Public (token) |
| `/dashboard` | Tableau de bord & liste des activités | Authentifié |
| `/activites/:id` | Détail d'une activité (participants, stats, exports) | Authentifié |
| `/participants` | Annuaire transverse des personnes | Authentifié |
| `/utilisateurs` | Gestion des comptes | Administrateur |
| `/journal` | Journal d'audit | Administrateur |
| `/parametres` | Paramètres & changement de mot de passe | Authentifié |
| `/aide`, `/a-propos` | Aide & informations | Authentifié |

---

## 8. Modèle de données

### 8.1 Entité `Utilisateur` (User)

| Champ | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant unique |
| username | VARCHAR(150) | UNIQUE, NOT NULL | Identifiant de connexion |
| email | VARCHAR(254) | UNIQUE, NOT NULL | Adresse email |
| password | VARCHAR(128) | NOT NULL | Mot de passe haché |
| role | ENUM | NOT NULL | `admin` / `organisateur` |
| is_active | BOOLEAN | DEFAULT TRUE | Compte actif |
| created_at | TIMESTAMP | AUTO | Date de création |

### 8.2 Entité `Activité`

| Champ | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant unique |
| nom | VARCHAR(255) | NOT NULL | Nom de l'activité |
| description | TEXT | NULLABLE | Description |
| date_debut | DATETIME | NOT NULL | Début |
| date_fin | DATETIME | NOT NULL | Fin (> début) |
| ville | VARCHAR(255) | — | Ville |
| lieu | VARCHAR(255) | NOT NULL | Lieu |
| token_qr | UUID | UNIQUE, NOT NULL | Token du formulaire public |
| statut | ENUM | NOT NULL | `ouvert` / `ferme` / `archive` |
| created_by | FK Utilisateur | NOT NULL | Organisateur propriétaire |
| created_at / updated_at | TIMESTAMP | AUTO | Horodatage |

### 8.3 Entité `Participant`

| Champ | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant unique |
| activite | FK Activité | NOT NULL | Activité liée |
| nom / prenom | VARCHAR(100) | NOT NULL | Identité |
| structure | VARCHAR(255) | NOT NULL | Organisation |
| fonction | VARCHAR(255) | NOT NULL | Poste occupé |
| telephone_wave | VARCHAR(20) | NOT NULL | Téléphone (format `+225…`) |
| email | VARCHAR(254) | NOT NULL | Email |
| numero_cni | VARCHAR(50) | NOT NULL | Numéro de CNI |
| photo_cni_recto | ImageField | — | Photo recto (normalisée) |
| photo_cni_verso | ImageField | — | Photo verso (normalisée) |
| horodatage | TIMESTAMP | AUTO | Date de saisie |
| ip_address | INET | NULLABLE | IP de soumission |
| | | **UNIQUE (activite, numero_cni)** | Anti-doublon |

### 8.4 Entité `ExportLog` (journal des exports)

| Champ | Type | Description |
|---|---|---|
| id | UUID | PK |
| activite | FK Activité | Activité concernée |
| type | ENUM | `excel` / `pdf_liste` / `zip` / `qrcode` / `fiche_cni` |
| nb_entrees | INT | Nombre d'entrées exportées |
| created_by | FK Utilisateur | Auteur (nullable) |
| created_at | TIMESTAMP | Date |

### 8.5 Entité `AuditLog` (journal d'audit)

| Champ | Type | Description |
|---|---|---|
| id | UUID | PK |
| user | FK Utilisateur | Auteur (nullable, `SET NULL`) |
| username | VARCHAR(150) | Identifiant capturé |
| action | ENUM | Type d'action (cf. AUD-01) |
| objet | VARCHAR(255) | Objet concerné |
| ip_address | INET | Adresse IP |
| created_at | TIMESTAMP | Date |

### 8.6 Diagramme relationnel (synthèse)

```
Utilisateur 1 ──< Activité 1 ──< Participant
     │                  │
     │                  └──< ExportLog
     └──< AuditLog
```

---

## 9. Interfaces de programmation (API)

L'API est exposée sous le préfixe `/api` et documentée automatiquement
(OpenAPI / `/api/docs`). Authentification par en-tête `Authorization: Bearer
<jeton>` sauf routes publiques.

### 9.1 Authentification & comptes (`/api/auth`)

| Méthode | Route | Auth | Rôle | Description |
|---|---|:---:|:---:|---|
| POST | `/login` | — | — | Connexion, délivre les jetons |
| POST | `/refresh` | — | — | Renouvelle le jeton d'accès |
| POST | `/logout` | JWT | tous | Déconnexion |
| GET | `/me` | JWT | tous | Profil courant |
| POST | `/change-password` | JWT | tous | Changement de mot de passe |
| GET | `/users` | JWT | admin | Liste des comptes |
| POST | `/users` | JWT | admin | Création de compte |
| PATCH | `/users/{id}` | JWT | admin | Modification de compte |
| POST | `/users/{id}/reset-password` | JWT | admin | Réinitialisation |
| DELETE | `/users/{id}` | JWT | admin | Suppression |
| GET | `/audit` | JWT | admin | Journal global |
| GET | `/users/{id}/audit` | JWT | admin | Journal par utilisateur |

### 9.2 Activités & participants (`/api/activites`)

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Liste des activités (selon RBAC) |
| POST | `/` | Création |
| GET | `/{id}` | Détail |
| PUT | `/{id}` | Modification |
| DELETE | `/{id}` | Suppression |
| POST | `/{id}/clone` | Clonage |
| GET | `/{id}/qrcode` | QR Code PNG |
| PATCH | `/{id}/statut` | Changement de statut |
| GET | `/stats-globales` | Statistiques globales |
| GET | `/personnes` | Annuaire dédupliqué |
| GET | `/personnes/historique` | Historique d'une personne |
| GET | `/{id}/participants` | Liste paginée/filtrée |
| POST | `/{id}/participants` | Ajout manuel |
| GET | `/{id}/participants/{pid}` | Fiche participant |
| GET | `/{id}/participants/{pid}/photo/{cote}` | Photo CNI (protégée) |
| GET | `/{id}/stats` | Statistiques d'activité |

### 9.3 Formulaire public (`/api/public`)

| Méthode | Route | Auth | Description |
|---|---|:---:|---|
| GET | `/activite/{token}` | — | Infos publiques de l'activité |
| POST | `/activite/{token}/participer` | — | Soumission + photos CNI |

### 9.4 Exports (`/api/exports`)

| Méthode | Route | Description |
|---|---|---|
| GET | `/activites/{id}/excel` | Export Excel |
| GET | `/activites/{id}/pdf-liste` | Liste de présence PDF |
| GET | `/activites/{id}/zip` | Archive ZIP des fiches CNI |
| GET | `/activites/{id}/qrcode-pdf` | Affiche QR Code PDF |
| GET | `/participants/{id}/pdf` | Fiche CNI individuelle PDF |
| GET | `/activites/{id}/historique` | Journal des exports |

### 9.5 Système

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/health` | Vérification de disponibilité |
| GET | `/api/docs` | Documentation interactive (OpenAPI) |

---

## 10. Livrables attendus

| # | Livrable | Format |
|---|---|---|
| L1 | Code source complet (back-end + front-end), versionné | Dépôt Git |
| L2 | Application déployée et opérationnelle en production | Environnement serveur |
| L3 | Jeu de tests automatisés et rapport d'exécution | Code + rapport |
| L4 | Scripts de déploiement, configuration Nginx & service systemd | `deploy/` |
| L5 | Scripts de sauvegarde (base + media) | `deploy/` |
| L6 | Documentation d'installation & d'exploitation | Markdown / PDF |
| L7 | Documentation API (OpenAPI) | Générée |
| L8 | Manuel utilisateur (organisateur & administrateur) | PDF |
| L9 | Jeu de données de démonstration (commande de seed) | Script |
| L10 | Procès-verbal de recette | Document signé |

---

## 11. Conditions de réalisation et planning

### 11.1 Méthodologie

Réalisation **itérative et incrémentale** en **6 sprints d'une semaine**, chaque
sprint produisant un incrément testable et déployable.

| Sprint | Intitulé | Livrables clés |
|---|---|---|
| 1 | Setup & infrastructure | Projets back/front, base, API Ninja, stockage media, Nginx/Gunicorn |
| 2 | Authentification & activités | Login JWT, CRUD activités, QR Code, RBAC |
| 3 | Formulaire public & CNI | Formulaire mobile, upload + traitement CNI, anti-doublon |
| 4 | Tableau de bord participants | Listes, filtres, fiches, statistiques, statut |
| 5 | Exports documentaires | Excel, fiche CNI PDF, liste de présence, ZIP, filtres, historique |
| 6 | Finition, tests & production | Tests automatisés, journalisation, optimisation, déploiement |

> **Note de conformité.** L'ensemble des modules ci-dessus a été implémenté et
> validé (≥ 45 tests automatisés au vert, typage front sans erreur). Des
> fonctionnalités complémentaires ont été ajoutées au socle : **journal
> d'audit**, **annuaire dédupliqué par CNI**, **gestion fine des comptes**,
> **base configurable SQLite/PostgreSQL** et **durcissement de sécurité
> production**. Le présent cahier des charges peut donc servir de référentiel
> pour une prestation de **tierce maintenance applicative (TMA)** et
> d'**évolutions**.

### 11.2 Environnements

- **Développement** : SQLite, mode debug, serveur local.
- **Production** : PostgreSQL, Gunicorn + Nginx, HTTPS, durcissement de sécurité activé.

---

## 12. Recette, réception et garantie

### 12.1 Vérification d'aptitude (VABF)

La recette est prononcée sur la base d'un **cahier de recettes** couvrant
chaque exigence fonctionnelle (AUTH, ACT, FORM, IMG, EXP, DASH, AUD). Chaque
test est rejoué en présence du maître d'ouvrage.

### 12.2 Vérification de service régulier (VSR)

Période d'observation de **30 jours** en conditions réelles, validant la
performance (§ 6.2), la disponibilité (§ 6.5) et l'absence d'anomalie bloquante.

### 12.3 Critères d'acceptation

- 100 % des exigences de priorité **Haute** opérationnelles ;
- Tests automatisés **au vert** ;
- Aucune anomalie **bloquante ou majeure** ouverte ;
- Documentation et livrables (§ 10) remis.

### 12.4 Garantie & maintenance

- **Garantie de parfait achèvement** : 3 mois après réception (corrections sans surcoût).
- **Maintenance corrective (TMA)** : délais d'intervention selon criticité (bloquant / majeur / mineur) à préciser dans l'offre.
- **Maintenance évolutive** : sur devis, à partir du périmètre § 14.3.

---

## 13. Cadre de réponse et critères de sélection

### 13.1 Composition de l'offre

Le soumissionnaire remet :

1. Une **note méthodologique** (compréhension du besoin, démarche, organisation) ;
2. Une **proposition technique** (architecture, choix technologiques, sécurité) ;
3. Une **matrice de conformité** au § 5 et § 6 (Conforme / Partiellement / Non conforme + commentaire) ;
4. Un **planning détaillé** et la composition de l'équipe (CV) ;
5. Une **offre financière** (développement + TMA) ;
6. Les **références** de projets similaires.

### 13.2 Critères d'évaluation (indicatifs)

| Critère | Pondération |
|---|:---:|
| Valeur technique & conformité fonctionnelle | 40 % |
| Sécurité & qualité (tests, durcissement, RGPD/données personnelles) | 20 % |
| Prix des prestations | 25 % |
| Délais & méthodologie | 10 % |
| Références & maintenance | 5 % |

### 13.3 Protection des données personnelles

La solution traite des **données à caractère personnel sensibles** (identité,
CNI). Le soumissionnaire décrit les mesures de conformité : minimisation,
sécurisation du stockage, contrôle d'accès, durée de conservation, traçabilité
(journal d'audit) et procédure de suppression/anonymisation sur demande.

---

## 14. Annexes

### 14.1 Glossaire

| Terme | Définition |
|---|---|
| **CNI** | Carte Nationale d'Identité |
| **JWT** | JSON Web Token — jeton d'authentification signé, sans état |
| **RBAC** | Role-Based Access Control — contrôle d'accès basé sur les rôles |
| **SPA** | Single Page Application — application web monopage |
| **TMA** | Tierce Maintenance Applicative |
| **Token QR** | Identifiant UUID opaque encodé dans le QR Code d'une activité |
| **VABF / VSR** | Vérification d'Aptitude / de Service Régulier |
| **OpenAPI** | Spécification standard de description d'API REST |

### 14.2 Règles de gestion notables (rappel)

- **RG-01** : `date_fin > date_debut` (toute activité).
- **RG-02** : unicité `(activité, numéro_cni)` — anti-doublon de participation.
- **RG-03** : suppression d'activité interdite si elle contient des participants.
- **RG-04** : suppression de compte interdite s'il a créé des activités.
- **RG-05** : un administrateur ne peut se rétrograder, se désactiver ni se supprimer.
- **RG-06** : édition par un organisateur limitée à ses activités **ouvertes**.
- **RG-07** : téléphone normalisé `+225` + 10 chiffres ; email et CNI validés.
- **RG-08** : accès d'un organisateur à une ressource d'autrui → `404`.

### 14.3 Pistes d'évolution (hors socle, pour information)

Évolutions envisageables en lots ultérieurs, non incluses dans le présent
marché sauf chiffrage en variante :

- **OCR des CNI** : extraction automatique des informations d'identité pour pré-remplissage.
- **Vérification faciale** anti-usurpation (selfie vs CNI).
- **Notifications WhatsApp / SMS** : confirmation de présence, attestation automatique, rappels.
- **Mode hors-ligne (PWA)** : collecte sans réseau et synchronisation différée.
- **Anti-fraude** : géolocalisation du pointage, QR Code rotatif (TOTP), pointage entrée/sortie.
- **Tableau de bord temps réel** (WebSockets) et reporting analytique avancé.
- **Billetterie Mobile Money** (Wave, Orange Money, MTN MoMo) pour activités payantes.

---

*Fin du cahier des charges — CDC-GPA-2026-001 v2.0.*
