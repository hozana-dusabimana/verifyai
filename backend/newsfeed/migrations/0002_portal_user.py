from django.contrib.auth.hashers import make_password
from django.db import migrations

# Dedicated least-privilege account the public "Civic Wire" portal auto-logs-in
# as, so the standalone external app works on a fresh deploy without any manual
# login or demo-user seeding. Role = citizen (can only submit articles / view
# own history). Credentials are intentionally public — they appear in the
# portal's client-side JS.
PORTAL_EMAIL = 'portal@civicwire.app'
PORTAL_USERNAME = 'civicwire_portal'
PORTAL_PASSWORD = 'CivicWire!Public2026'


def create_portal_user(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    if User.objects.filter(email=PORTAL_EMAIL).exists():
        return
    User.objects.create(
        email=PORTAL_EMAIL,
        username=PORTAL_USERNAME,
        first_name='Civic',
        last_name='Wire',
        role='citizen',
        is_email_verified=True,
        is_active=True,
        password=make_password(PORTAL_PASSWORD),
    )


def remove_portal_user(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(email=PORTAL_EMAIL).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('newsfeed', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_portal_user, remove_portal_user),
    ]
