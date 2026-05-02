# VerifyAI Backend

Django REST Framework API for the VerifyAI fake news detection and credibility analysis platform.

## Tech Stack

- **Framework:** Django 6.0.3 + Django REST Framework 3.17.0
- **Auth:** JWT (SimpleJWT) with refresh token rotation
- **Async Tasks:** Celery 5.6.2 + Redis
- **Database:** SQLite (dev) / MySQL (prod)
- **Email:** SendGrid (configurable)

## Prerequisites

- Python 3.12+
- Redis (required for Celery async tasks)
- Git

## Run with Docker (Recommended)

The backend ships with a [Dockerfile](Dockerfile) and a [docker-compose.yml](docker-compose.yml) that brings up the full backend stack: **MariaDB**, **Redis**, the **Django API**, and a **Celery worker** — no local Python or database install needed.

### Start the backend stack

From the `backend/` directory:

```bash
docker compose up --build
```

| Service | Container | Host port | Purpose |
|---------|-----------|-----------|---------|
| `backend` | `verifyai-backend` | `8001` | Django API (auto-runs `migrate` on start) |
| `celery` | `verifyai-celery` | — | Async task worker |
| `db` | `verifyai-db` | `3308` | MariaDB 10.11 (`verifyai` / `verifyai`) |
| `redis` | `verifyai-redis` | internal | Celery broker |

The API will be available at **http://localhost:8001/api/v1/**.

> Tip: from the **project root** you can run `docker compose up --build` to start the backend stack **and** the frontend together (the root compose file includes both). See the [root README](../README.md#run-with-docker-recommended) for details.

### Useful commands

```bash
# Background mode
docker compose up -d --build

# Tail backend / celery logs
docker compose logs -f backend
docker compose logs -f celery

# Create a Django superuser
docker compose exec backend python manage.py createsuperuser

# Train ML models inside the container
docker compose exec backend python -m ml_engine.train

# Open a shell in the backend container
docker compose exec backend bash

# Stop everything (keeps data volumes)
docker compose down

# Stop and wipe DB + Redis + model caches
docker compose down -v
```

### Volumes

| Volume | Purpose |
|--------|---------|
| `db_data` | MariaDB data files |
| `redis_data` | Redis persistence |
| `hf_cache` | HuggingFace model cache (avoids re-downloading DistilBERT base) |
| `nltk_data` | NLTK corpora (`punkt`, `stopwords`, `wordnet`) |

The backend code itself is bind-mounted (`.:/app`) so edits on the host are picked up by Django's autoreloader.

### Notes

- **First build takes ~5–10 minutes** — it installs the PyTorch CPU wheel and the ML stack.
- ML model weights are **not** in the image. Train them inside the container or place pre-trained files in `ml_engine/models_store/` on the host (bind-mounted into the container).
- Default credentials in the compose file are for development only — **change them before any non-local deployment**.
- Host port `3308` is used for MariaDB to avoid clashing with XAMPP's MySQL on `3306`.

---

## Manual Setup (without Docker)

### 1. Clone and navigate to the backend

```bash
cd backend
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | *(must set)* |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated hosts | `localhost,127.0.0.1` |
| `DB_ENGINE` | Database engine | `django.db.backends.sqlite3` |
| `DB_NAME` | Database name | `db.sqlite3` |
| `CELERY_BROKER_URL` | Redis URL for Celery | `redis://localhost:6379/0` |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins | `http://localhost:5173,http://localhost:3000` |

See [.env.example](.env.example) for all available options including database, email, and OAuth settings.

### 5. Run migrations

```bash
python manage.py migrate
```

### 6. Create a superuser

```bash
python manage.py createsuperuser
```

### 7. Start the development server

```bash
python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000`.

### 8. Start Celery worker (optional, for async analysis)

```bash
celery -A config worker --loglevel=info
```

## Project Structure

```
backend/
├── config/            # Project settings, URLs, WSGI/ASGI, Celery config
├── accounts/          # User auth, registration, OAuth, API keys
├── analysis/          # Article submission & ML analysis pipeline
├── alerts/            # Alert management & notifications
├── analytics/         # Dashboard stats, trends, reports
├── administration/    # Admin tools, audit logs, datasets, system health
├── manage.py
├── requirements.txt
└── .env.example
```

## Apps

### accounts
User management with JWT auth, role-based access (Journalist, Government, Citizen, Admin), Google OAuth2, email verification, 2FA support, and API key management.

### analysis
Core ML pipeline for fake news detection. Supports text, URL, and file submissions. Runs Naive Bayes, LSTM, DistilBERT, and ensemble scoring asynchronously via Celery. Provides explainability data (keywords, flagging reasons).

### alerts
Auto-generates alerts when article credibility falls below threshold. Supports alert statuses (open, reviewed, escalated, resolved, dismissed) and user notification preferences.

### analytics
Dashboard with summary stats, time-series trends, source credibility analysis, keyword analysis, and topic distribution. Report generation with PDF/CSV export.

### administration
Admin-only tools: system health monitoring (DB, Redis, Celery), audit logging, ML dataset management, and global alert rule configuration.

## API Endpoints

All endpoints are prefixed with `/api/v1/`.

| Prefix | App | Description |
|--------|-----|-------------|
| `/api/v1/auth/` | accounts | Login, register, token refresh, OAuth |
| `/api/v1/users/` | accounts | User profile, API keys |
| `/api/v1/analysis/` | analysis | Submit articles, view results, export |
| `/api/v1/alerts/` | alerts | Manage alerts, notification preferences |
| `/api/v1/analytics/` | analytics | Dashboard stats, trends |
| `/api/v1/reports/` | analytics | Generate and download reports |
| `/api/v1/admin/` | administration | System health, audit logs, datasets |

## Authentication

The API uses JWT Bearer tokens:

```
Authorization: Bearer <access_token>
```

- **Access token:** 15-minute expiry
- **Refresh token:** 7-day expiry with rotation and blacklisting

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Citizen** | Submit articles, view own results, manage alerts |
| **Journalist** | + Analytics dashboard, export reports, bulk submit |
| **Government** | + Analytics dashboard, export reports |
| **Admin** | Full access: audit logs, datasets, system health, user management |
