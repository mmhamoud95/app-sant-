# Backend — Guide d’utilisation

Ce document résume l’architecture du répertoire `backend/` et explique comment le lancer, le configurer et l’utiliser (API, base de données, tests).

## Aperçu

- Framework: FastAPI (Python 3.11)
- DB: PostgreSQL (en Docker) ou SQLite (par défaut en dev), via SQLAlchemy 2.x
- Cache/ratelimit: Redis (caching catalogue/annuaire + rate limiting login)
- Auth: JWT Bearer pour l’accès, Refresh Token en cookie HttpOnly
- Observabilité: logs JSON, endpoint `/metrics` (admin), middleware de logs/latence
- Migrations: Alembic (dossiers `alembic/` et `app/db/models.py`)

Chemin de base de l’API: configurable, par défaut `/api/v1`.

## Structure rapide

- `app/main.py`: création de l’appli, CORS, middlewares, routes, création des tables, seed de données de référence
- `app/config.py`: configuration via variables d’environnement (Pydantic Settings)
- `app/db/models.py`: modèles SQLAlchemy (User, Patient, Doctor, Slots, Appointments, Notifications, Audit, etc.)
- `app/db/session.py`: moteur/Session SQLAlchemy
- `app/routers/…`: endpoints (auth, annuaire, patients, médecins, admin, santé, metrics)
- `app/services/…`: logique métier (RDV, disponibilité, notifications, audit, rate limiting)
- `app/infra/…`: clients/infra (Redis, configuration des logs)
- `alembic/…`: migrations
- `Dockerfile`, `run.sh`, `requirements.txt`: conteneurisation et démarrage

## Configuration (.env)

Les variables principales (valeurs par défaut en dev) sont définies dans `app/config.py`:

- `project_name`: nom de l’app
- `api_v1_prefix`: chemin de base de l’API (ex: `/api/v1`)
- `database_url`: URL SQLAlchemy (ex: `postgresql+psycopg2://user:pass@host:5432/db` ou `sqlite+pysqlite:///./test.db`)
- `redis_url`: URL Redis (ex: `redis://localhost:6379/0`)
- `backend_cors_origins`: origines CORS autorisées, séparées par virgules
- `secret_key`: clé de signature JWT (à changer en prod)
- `access_token_exp_minutes`: durée de vie de l’accès (JWT)
- `refresh_token_exp_days`: durée de vie du refresh token
- Cookies refresh: `refresh_token_cookie_*` (name, secure, domain, path, same_site)
- Rate limiting login: `login_rate_limit_per_ip`, `login_rate_limit_per_email`, `login_rate_limit_window_seconds`

Créez un fichier `.env.dev` à la racine du projet pour Docker Compose, par exemple:

```
DATABASE_URL=postgresql+psycopg2://app:app@db:5432/app_sante
REDIS_URL=redis://redis:6379/0
BACKEND_PORT=8000
FRONTEND_PORT=5173
VITE_API_BASE=http://localhost:8000/api/v1
SECRET_KEY=change-me
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Note: en local sans Docker, adaptez `DATABASE_URL` et `REDIS_URL` (ex: `sqlite+pysqlite:///./test.db` et `redis://localhost:6379/0`).

## Démarrage avec Docker Compose

Services déclarés dans `docker-compose.yml` (racine): PostgreSQL, Redis, Backend, Frontend.

- Construire et démarrer:

```bash
docker compose up -d --build
```

- Backend: http://localhost:${BACKEND_PORT:-8000}
  - Docs Swagger: `GET /api/v1/docs`
  - Healthcheck: `GET /api/v1/health`

- Arrêter:

```bash
docker compose down
```

Les tables sont créées au démarrage (via `Base.metadata.create_all`) et des données de référence (spécialités, langues) sont seedées.

## Démarrage en local (sans Docker)

1) Python 3.11 + venv, installation des deps:

```bash
cd backend
python3.11 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

2) Variables d’environnement (exemple SQLite + Redis local):

```bash
export DATABASE_URL="sqlite+pysqlite:///./test.db"
export REDIS_URL="redis://localhost:6379/0"
export SECRET_KEY="change-me"
```

3) Lancer l’API:

```bash
uvicorn app.main:app --reload --port 8000
```

## Base de données et migrations

- Démarrage dev: les tables sont créées automatiquement. Pour un cycle CI/CD ou des changements de schéma, utilisez Alembic.
- Fichiers Alembic: `backend/alembic/` (env, versions). Ils lisent `DATABASE_URL` depuis la config.

Commandes type (dans le conteneur backend ou localement avec venv):

```bash
# Générer une migration après modification des modèles
alembic revision -m "your message"

# Appliquer les migrations
alembic upgrade head
```

## Authentification et sécurité

- Login: `POST /auth/login` — retourne un JWT (Authorization: Bearer) et place un refresh token en cookie HttpOnly.
- Refresh: `POST /auth/refresh` — lit le cookie, retourne un nouveau JWT et remplace le refresh token (rotation + blacklist Redis).
- Logout: `POST /auth/logout` — révoque et nettoie le cookie.
- Accès aux routes protégées: via `Authorization: Bearer <access_token>`.
- Rate limiting: appliqué sur les tentatives de login (IP/email) via Redis; si Redis indisponible, le flux de login reste accessible (fail-open).

## Endpoints principaux (aperçu)

- Santé: `GET /health` — DB + Redis
- Auth:
  - `POST /auth/patient/register`, `POST /auth/doctor/register`
  - `POST /auth/login`, `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout`
- Annuaire (public):
  - `GET /specialties` — liste des spécialités (cache Redis)
  - `GET /doctors` — recherche (spécialité, ville, langue, date, pagination)
  - `GET /doctors/{doctor_id}` — profil + prochains créneaux (cache Redis)
- Médecins (auth docteur):
  - `GET /doctors/me/availability` — règles/exceptions
  - `POST /doctors/me/availability` — créer règle/exception (re-génère les slots)
  - `DELETE /doctors/me/availability/{item_id}` — supprimer
- Patients (auth patient):
  - `GET /patients/me` — profil
  - `PUT /patients/me` — mise à jour
  - `GET /patients/me/appointments` — liste filtrable/paginée
  - `POST /patients/me/appointments` — réserver
  - `PATCH /patients/me/appointments/{id}/reschedule` — replanifier
  - `POST /patients/me/appointments/{id}/cancel` — annuler
- Admin (auth admin):
  - `GET /admin/doctors?status=pending|verified` — lister
  - `POST /admin/doctors/{doctor_id}/verify` — vérifier/dé-vérifier
- Metrics (auth admin): `GET /metrics` — snapshot d’indicateurs (volumétrie requêtes, latence, etc.)

Toutes les routes ci-dessus sont préfixées par `api_v1_prefix` (ex: `/api/v1`).

## Disponibilités, slots et RDV

- Les médecins définissent des règles hebdo (jour, plage horaire, durée des créneaux) et des exceptions (jours fermés).
- La fonction `regenerate_slots_for_doctor` reconstruit les créneaux futurs libres (60 jours rolling window). Les créneaux déjà réservés ne sont pas recréés.
- Réservation/annulation/replanification verrouillent les slots au niveau DB (`SELECT … FOR UPDATE`) et mettent à jour le statut (`free/reserved`).
- Notifications: des entrées sont ajoutées en DB (type, payload JSON, statut `pending`, éventuellement planifiées). Aucun worker d’envoi n’est fourni ici—à intégrer selon votre canal (email/SMS/… ).

## Cache et observabilité

- Redis: caching des réponses pour spécialités, recherche médecin, profil/slots (TTL configurés).
- Middleware de log: traces JSON (chemin, méthode, statut, latence, request_id) + header `X-Request-ID`.
- `GET /metrics` (admin): snapshot d’indicateurs collectés côté middleware/service.

## Tests

Lancez les tests depuis `backend/`:

```bash
pytest -q
```

Les tests utilisent l’API FastAPI et couvrent santé, auth, annuaire, disponibilités médecins, patients/RDV, admin, metrics.

## Conseils de prod

- Définir `SECRET_KEY` fort et unique.
- Utiliser Postgres managé et Redis managé.
- Activer TLS en amont (reverse proxy) + définir `refresh_token_cookie_secure=true` et `SameSite` adapté.
- Remplacer la création automatique de tables par un workflow de migrations Alembic.
- Mettre en place un worker pour traiter la table `notification`.

## Dépannage rapide

- `/health` renvoie `degraded`: vérifier Redis; la DB est validée via `SELECT 1`.
- Erreur 401/403: vérifier le header `Authorization: Bearer <token>` et le rôle de l’utilisateur.
- Conflit de réservation (409): slot déjà pris ou invalide; rafraîchir les créneaux.
- CORS: ajuster `backend_cors_origins`.
