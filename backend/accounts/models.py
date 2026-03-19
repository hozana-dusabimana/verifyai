import uuid
import hashlib
import secrets

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with UUID primary key, roles, and organization."""

    class Role(models.TextChoices):
        JOURNALIST = 'journalist', 'Journalist'
        GOVERNMENT = 'government', 'Government'
        CITIZEN = 'citizen', 'Citizen'
        ADMIN = 'admin', 'Admin'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    organization = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CITIZEN)
    is_email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=128, blank=True)
    password_reset_token = models.CharField(max_length=128, blank=True)
    password_reset_token_created = models.DateTimeField(null=True, blank=True)
    oauth_provider = models.CharField(max_length=50, blank=True, null=True)
    oauth_uid = models.CharField(max_length=255, blank=True, null=True)
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    is_2fa_enabled = models.BooleanField(default=False)
    totp_secret = models.CharField(max_length=64, blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    lockout_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser

    def has_role_permission(self, permission):
        """Check role-based permission."""
        permissions_map = {
            'submit_articles': [self.Role.JOURNALIST, self.Role.GOVERNMENT, self.Role.CITIZEN, self.Role.ADMIN],
            'view_own_history': [self.Role.JOURNALIST, self.Role.GOVERNMENT, self.Role.CITIZEN, self.Role.ADMIN],
            'analytics_dashboard': [self.Role.JOURNALIST, self.Role.GOVERNMENT, self.Role.ADMIN],
            'export_reports': [self.Role.JOURNALIST, self.Role.GOVERNMENT, self.Role.ADMIN],
            'manage_alerts': [self.Role.JOURNALIST, self.Role.GOVERNMENT, self.Role.ADMIN],
            'bulk_submission': [self.Role.JOURNALIST, self.Role.GOVERNMENT, self.Role.ADMIN],
            'api_keys': [self.Role.GOVERNMENT, self.Role.ADMIN],
            'view_org_analyses': [self.Role.GOVERNMENT, self.Role.ADMIN],
            'manage_users': [self.Role.ADMIN],
            'upload_datasets': [self.Role.ADMIN],
            'trigger_retrain': [self.Role.ADMIN],
            'view_audit_logs': [self.Role.ADMIN],
        }
        allowed_roles = permissions_map.get(permission, [])
        return self.role in allowed_roles


class APIKey(models.Model):
    """API keys for programmatic access."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100)
    key_hash = models.CharField(max_length=128, unique=True)
    prefix = models.CharField(max_length=8)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'api_keys'

    def __str__(self):
        return f'{self.name} ({self.prefix}...)'

    @staticmethod
    def generate_key():
        """Generate a new API key. Returns (raw_key, key_hash, prefix)."""
        raw_key = f'vai_{secrets.token_urlsafe(32)}'
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        prefix = raw_key[:8]
        return raw_key, key_hash, prefix
