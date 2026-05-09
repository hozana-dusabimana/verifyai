"""Signal receivers for the accounts app."""

import logging

logger = logging.getLogger(__name__)


def auto_seed_demo_users(sender, **kwargs):
    """Run after `manage.py migrate` to keep demo users in sync.

    Idempotent — re-running is a no-op when users already match the spec.
    The receiver is wired in ``AccountsConfig.ready()`` and is gated by
    ``settings.AUTO_SEED_DEMO_USERS`` (default True in DEBUG, False otherwise).
    """
    from .management.commands.seed_demo_users import seed

    try:
        created, updated = seed()
    except Exception:
        # Never let a seed failure break a deploy or migration. Log and move on.
        logger.exception('auto_seed_demo_users failed')
        return

    if created or updated:
        logger.info('Demo users auto-seeded: %d created, %d updated.', created, updated)
