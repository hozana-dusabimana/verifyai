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

## Getting Started

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
