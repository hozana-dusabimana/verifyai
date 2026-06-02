from django.urls import path

from . import views

urlpatterns = [
    path('admin/system/health', views.SystemHealthView.as_view(), name='system-health'),
    path('admin/audit-logs', views.AuditLogListView.as_view(), name='audit-logs'),
    path('admin/datasets/upload', views.DatasetUploadView.as_view(), name='dataset-upload'),
    path('admin/datasets', views.DatasetListView.as_view(), name='dataset-list'),
    path('admin/datasets/<uuid:dataset_id>', views.DatasetDeleteView.as_view(), name='dataset-delete'),
    path('admin/alerts/rules', views.AlertRulesView.as_view(), name='alert-rules'),
    path('admin/metrics', views.AdminMetricsView.as_view(), name='admin-metrics'),
    # Statistics & organization oversight
    path('admin/statistics', views.AdminStatisticsView.as_view(), name='admin-statistics'),
    path('admin/organizations', views.AdminOrganizationsView.as_view(), name='admin-organizations'),
    path('admin/organizations/detail', views.AdminOrganizationDetailView.as_view(), name='admin-organization-detail'),
    path('admin/users/<uuid:user_id>/activity', views.AdminUserActivityView.as_view(), name='admin-user-activity'),
    # ML Engine endpoints
    path('ml/models', views.MLModelsView.as_view(), name='ml-models'),
    path('ml/retrain', views.MLRetrainView.as_view(), name='ml-retrain'),
    path('ml/training-jobs', views.TrainingJobListView.as_view(), name='ml-training-jobs'),
    path('ml/training-jobs/<uuid:job_id>', views.TrainingJobDetailView.as_view(), name='ml-training-job-detail'),
    path('ml/health', views.MLHealthView.as_view(), name='ml-health'),
    path('ml/predict', views.MLPredictView.as_view(), name='ml-predict'),
]
