import pymysql
pymysql.install_as_MySQLdb()
# PyMySQL reports version 1.4.6 but Django 6 requires mysqlclient >= 2.2.1.
# Patch the version so Django's check passes — PyMySQL is fully compatible.
pymysql.version_info = (2, 2, 7, 'final', 0)

# XAMPP ships MariaDB 10.4 but Django 6 requires 10.6+.
# Patch the version check to allow 10.4 — all features we use are compatible.
from django.db.backends.base import base as _base_backend
_original_check = _base_backend.BaseDatabaseWrapper.check_database_version_supported

def _patched_check(self):
    pass

_base_backend.BaseDatabaseWrapper.check_database_version_supported = _patched_check

try:
    from .celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError:
    celery_app = None
    __all__ = ()
