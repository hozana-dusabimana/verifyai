from django.urls import path

from . import views

urlpatterns = [
    path('alerts', views.AlertListView.as_view(), name='alert-list'),
    path('alerts/settings', views.AlertSettingsView.as_view(), name='alert-settings'),
    path('alerts/<uuid:alert_id>', views.AlertDetailView.as_view(), name='alert-detail'),
    path('alerts/<uuid:alert_id>/resolve', views.AlertResolveView.as_view(), name='alert-resolve'),
    path('alerts/<uuid:alert_id>/escalate', views.AlertEscalateView.as_view(), name='alert-escalate'),
    path('alerts/<uuid:alert_id>/dismiss', views.AlertDismissView.as_view(), name='alert-dismiss'),
]
