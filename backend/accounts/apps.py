import sys

from django.apps import AppConfig
from django.conf import settings


class AccountsConfig(AppConfig):
    name = 'accounts'

    def ready(self):
        # Skip when running tests — they use a separate ephemeral DB and shouldn't be polluted.
        if 'test' in sys.argv:
            return

        # Opt-out switch. Default: enabled in DEBUG, disabled in production.
        default = bool(getattr(settings, 'DEBUG', False))
        if not getattr(settings, 'AUTO_SEED_DEMO_USERS', default):
            return

        from django.db.models.signals import post_migrate
        from . import signals

        post_migrate.connect(
            signals.auto_seed_demo_users,
            sender=self,
            dispatch_uid='accounts.auto_seed_demo_users',
        )
