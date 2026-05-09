from django.urls import path

from . import views

urlpatterns = [
    path('analytics/summary', views.AnalyticsSummaryView.as_view(), name='analytics-summary'),
    path('analytics/trends', views.AnalyticsTrendsView.as_view(), name='analytics-trends'),
    path('analytics/sources', views.AnalyticsSourcesView.as_view(), name='analytics-sources'),
    path('analytics/keywords', views.AnalyticsKeywordsView.as_view(), name='analytics-keywords'),
    path('analytics/topics', views.AnalyticsTopicsView.as_view(), name='analytics-topics'),
    path('reports/generate', views.ReportGenerateView.as_view(), name='report-generate'),
    path('reports/<uuid:report_id>', views.ReportDetailView.as_view(), name='report-detail'),
    path('reports', views.ReportListView.as_view(), name='report-list'),
    path('analytics/platform-stats', views.PlatformStatsView.as_view(), name='platform-stats'),
    path('analytics/org-summary', views.OrgSummaryView.as_view(), name='analytics-org-summary'),
    path('analytics/org-feed', views.OrgFeedView.as_view(), name='analytics-org-feed'),
    path('analytics/org-alert/<uuid:alert_id>', views.OrgAlertActionView.as_view(), name='analytics-org-alert-action'),
]
