from django.contrib import admin

from .models import Alert, NotificationPreference


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'severity', 'status', 'created_at']
    list_filter = ['severity', 'status']
    search_fields = ['message', 'user__email']


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'email_on_high_risk', 'alert_threshold', 'email_frequency']
