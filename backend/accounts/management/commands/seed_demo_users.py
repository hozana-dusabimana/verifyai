from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

User = get_user_model()


DEMO_USERS = [
    {
        'email': 'admin@verifyai.demo',
        'username': 'admin_demo',
        'password': 'AdminDemo!2026',
        'first_name': 'Ada',
        'last_name': 'Admin',
        'role': 'admin',
        'organization': 'VerifyAI Platform',
        'is_staff': True,
        'is_superuser': True,
    },
    {
        'email': 'gov@verifyai.demo',
        'username': 'gov_demo',
        'password': 'GovDemo!2026',
        'first_name': 'Grace',
        'last_name': 'Government',
        'role': 'government',
        'organization': 'Ministry of Information',
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'email': 'journalist@verifyai.demo',
        'username': 'journalist_demo',
        'password': 'JournoDemo!2026',
        'first_name': 'Jamal',
        'last_name': 'Journalist',
        'role': 'journalist',
        'organization': 'The Daily Verifier',
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'email': 'citizen@verifyai.demo',
        'username': 'citizen_demo',
        'password': 'CitizenDemo!2026',
        'first_name': 'Cara',
        'last_name': 'Citizen',
        'role': 'citizen',
        'organization': '',
        'is_staff': False,
        'is_superuser': False,
    },
]

SYNC_FIELDS = ('username', 'first_name', 'last_name', 'role',
               'organization', 'is_staff', 'is_superuser')


def seed(*, reset_passwords=False, write=None):
    """Idempotently create or refresh the four demo users.

    Args:
        reset_passwords: When True, also re-set passwords for existing users.
        write: Optional callable (e.g. ``stdout.write``) for per-row output.

    Returns:
        Tuple of ``(created_count, updated_count)``.
    """
    emit = write if callable(write) else (lambda _msg: None)
    created = updated = 0

    with transaction.atomic():
        for spec in DEMO_USERS:
            email = spec['email']
            password = spec['password']

            user = User.objects.filter(email=email).first()
            if user is None:
                user = User(email=email, is_active=True, is_email_verified=True)
                for field in SYNC_FIELDS:
                    setattr(user, field, spec[field])
                user.set_password(password)
                user.save()
                created += 1
                emit(f'  + created {email} ({spec["role"]})')
                continue

            changed = []
            for field in SYNC_FIELDS:
                if getattr(user, field) != spec[field]:
                    setattr(user, field, spec[field])
                    changed.append(field)
            if not user.is_active:
                user.is_active = True
                changed.append('is_active')
            if not user.is_email_verified:
                user.is_email_verified = True
                changed.append('is_email_verified')
            if reset_passwords:
                user.set_password(password)
                changed.append('password')

            if changed:
                user.save()
                updated += 1
                emit(f'  ~ updated {email}: {", ".join(changed)}')
            else:
                emit(f'  = unchanged {email}')

    return created, updated


class Command(BaseCommand):
    help = 'Create or refresh the four demo users (Admin, Government, Journalist, Citizen).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset-passwords',
            action='store_true',
            help='Reset passwords for existing demo users to the documented defaults.',
        )

    def handle(self, *args, **options):
        created, updated = seed(
            reset_passwords=options['reset_passwords'],
            write=self.stdout.write,
        )
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done. {created} created, {updated} updated. See CREDENTIALS.md for login details.'
        ))
