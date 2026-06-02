"""Custom DRF authentication for programmatic API-key access.

Keys are issued from Settings → API Keys as `vai_...` tokens and presented as
`Authorization: Bearer vai_...`. Only the SHA-256 hash is stored, so we hash the
presented token and look it up. Non-`vai_` Bearer tokens are ignored here so the
JWT authenticator can handle normal browser sessions.
"""

import hashlib

from django.utils import timezone
from rest_framework import authentication, exceptions

from .models import APIKey

API_KEY_PREFIX = 'vai_'


class APIKeyAuthentication(authentication.BaseAuthentication):
    keyword = b'bearer'

    def authenticate(self, request):
        auth = authentication.get_authorization_header(request).split()
        if not auth or auth[0].lower() != self.keyword or len(auth) != 2:
            return None

        token = auth[1].decode('utf-8', errors='ignore')
        if not token.startswith(API_KEY_PREFIX):
            return None  # Not an API key — let JWTAuthentication try it.

        key_hash = hashlib.sha256(token.encode()).hexdigest()
        try:
            api_key = APIKey.objects.select_related('user').get(
                key_hash=key_hash, is_active=True,
            )
        except APIKey.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid or revoked API key.')

        if not api_key.user.is_active:
            raise exceptions.AuthenticationFailed('User account is inactive.')

        # Best-effort last-used stamp (no save() race, no extra full write).
        APIKey.objects.filter(pk=api_key.pk).update(last_used_at=timezone.now())

        return (api_key.user, api_key)

    def authenticate_header(self, request):
        return 'Bearer'
