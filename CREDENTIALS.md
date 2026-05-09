# Default Demo Credentials

These accounts let you log in to VerifyAI as each role and see the role-specific dashboard. They are created (or refreshed) by the `seed_demo_users` management command.

> **Warning:** these credentials are for local development, demos, and the capstone presentation **only**. They must never be deployed to a public or production environment. Rotate or remove all four accounts before any non-local deployment.

---

## How the demo users are seeded

**Auto-seed (default in development).** A `post_migrate` signal in `accounts/apps.py` runs the seed automatically every time you apply migrations. The standard backend startup — both local (`python manage.py migrate && python manage.py runserver`) and Docker (the `backend` service in [`backend/docker-compose.yml`](backend/docker-compose.yml) already runs `migrate --noinput` before `runserver`) — therefore creates the four demo accounts on first boot, and keeps them in sync on every subsequent boot.

The seed function is **idempotent**: re-running never duplicates users, and only updates fields that have drifted from the spec.

**Manual run** (any time):

```bash
python manage.py seed_demo_users                    # create or update
python manage.py seed_demo_users --reset-passwords  # also re-set passwords to documented defaults
```

**Disable auto-seed** (recommended for staging/production):

```bash
# Either set DEBUG=False (auto-seed defaults off in non-debug mode)
# or be explicit:
export AUTO_SEED_DEMO_USERS=false
```

In tests, auto-seed is skipped automatically — the receiver checks `'test' in sys.argv` and bails out so test fixtures stay clean.

---

## Accounts

| Role          | Email                       | Password           | Organization              | Lands on                 |
|---------------|-----------------------------|--------------------|---------------------------|--------------------------|
| Admin         | `admin@verifyai.demo`       | `AdminDemo!2026`   | VerifyAI Platform         | Admin console + journalist analytics |
| Government    | `gov@verifyai.demo`         | `GovDemo!2026`     | Ministry of Information   | Government operations dashboard |
| Journalist    | `journalist@verifyai.demo`  | `JournoDemo!2026`  | The Daily Verifier        | Newsroom briefing dashboard |
| Citizen       | `citizen@verifyai.demo`     | `CitizenDemo!2026` | *(none)*                  | Citizen "Is it real?" dashboard |

All four accounts are created with `is_active=True` and `is_email_verified=True`, so they can log in immediately without an email-verification step.

---

## What each role sees

### Admin (`admin@verifyai.demo`)
- Has `is_superuser=True` and `is_staff=True` — full Django admin access at `/admin/` and the in-app `/admin/*` console (System Health, User Management, Datasets, Audit Logs, ML Models).
- The main `/dashboard` route renders the Journalist analytics view, since admins benefit from the same source/narrative tools.

### Government (`gov@verifyai.demo`)
- Org-wide operations dashboard. Sees all analyses submitted by users sharing the same `organization` value (`Ministry of Information`).
- Live escalation queue with **Resolve** / **Escalate** actions on org-wide alerts.
- 30-day FAKE-content heatmap, top spreading sources by FAKE volume, topic mix.
- Backed by `/api/v1/analytics/org-summary` and `/api/v1/analytics/org-feed`.

### Journalist (`journalist@verifyai.demo`)
- Newsroom briefing: source reliability matrix (color-tiered by avg credibility), disinfo narrative bars from FAKE-keyword frequency, REAL-vs-FAKE 30-day trend, vetted-articles stats.
- Recent analyses include a one-click **PDF citation** export.

### Citizen (`citizen@verifyai.demo`)
- Streamlined "Is it real?" experience: large quick-check input, personal trust score, last 5 checks with one-line reasoning, daily verification tip.
- No advanced analytics or source reports — kept deliberately simple.

---

## Testing org-scoped data

To see Government's dashboard light up with realistic data, create one or more extra users with `organization='Ministry of Information'` and submit analyses from them. The Government user will see the aggregate. Example:

```bash
python manage.py shell
>>> from django.contrib.auth import get_user_model
>>> U = get_user_model()
>>> U.objects.create_user(
...     username='analyst1', email='analyst1@verifyai.demo',
...     password='Analyst!2026', role='journalist',
...     organization='Ministry of Information', is_email_verified=True,
... )
```

Now any analysis submitted by `analyst1` will appear in `gov@verifyai.demo`'s org dashboard.

---

## Rotating or removing demo accounts

```bash
# Rotate passwords (after editing DEMO_USERS in seed_demo_users.py):
python manage.py seed_demo_users --reset-passwords

# Disable all demo accounts:
python manage.py shell -c "from django.contrib.auth import get_user_model; \
  U=get_user_model(); U.objects.filter(email__endswith='@verifyai.demo').update(is_active=False)"

# Delete them entirely:
python manage.py shell -c "from django.contrib.auth import get_user_model; \
  U=get_user_model(); U.objects.filter(email__endswith='@verifyai.demo').delete()"
```
