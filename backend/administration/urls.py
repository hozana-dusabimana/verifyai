from django.urls import path

from . import views

urlpatterns = [
    path('admin/system/health', views.SystemHealthView.as_view(), name='system-health'),
    path('admin/audit-logs', views.AuditLogListView.as_view(), name='audit-logs'),
    path('admin/datasets/upload', views.DatasetUploadView.as_view(), name='dataset-upload'),
    path('admin/datasets', views.DatasetListView.as_view(), name='dataset-list'),
    path('admin/alerts/rules', views.AlertRulesView.as_view(), name='alert-rules'),
    path('admin/metrics', views.AdminMetricsView.as_view(), name='admin-metrics'),
]
