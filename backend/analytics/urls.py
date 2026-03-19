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
]
