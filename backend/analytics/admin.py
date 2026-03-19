from django.contrib import admin

from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'title', 'report_format', 'status', 'created_at']
    list_filter = ['report_format', 'status']
    search_fields = ['title', 'user__email']
