from django.contrib import admin

from .models import AuditLog, Dataset, AlertRule


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'action', 'resource_type', 'ip_address', 'created_at']
    list_filter = ['action', 'resource_type']
    search_fields = ['action', 'user__email', 'ip_address']
    readonly_fields = ['id', 'user', 'action', 'resource_type', 'resource_id',
                       'ip_address', 'user_agent', 'metadata', 'created_at']


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    list_display = ['name', 'uploaded_by', 'record_count', 'created_at']
    search_fields = ['name']


@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'credibility_threshold', 'is_active', 'updated_at']
    list_filter = ['is_active']
