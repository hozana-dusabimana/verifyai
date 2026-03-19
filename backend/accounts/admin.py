from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, APIKey


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'full_name', 'role', 'is_email_verified', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'is_email_verified', 'oauth_provider']
    search_fields = ['email', 'first_name', 'last_name', 'organization']
    ordering = ['-created_at']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('VerifyAI Fields', {
            'fields': ('organization', 'role', 'is_email_verified', 'oauth_provider', 'oauth_uid', 'profile_photo', 'is_2fa_enabled'),
        }),
    )


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'prefix', 'is_active', 'last_used_at', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'user__email']
