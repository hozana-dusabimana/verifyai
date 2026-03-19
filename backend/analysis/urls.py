from django.urls import path

from . import views

urlpatterns = [
    path('analysis/submit', views.AnalysisSubmitView.as_view(), name='analysis-submit'),
    path('analysis/history', views.AnalysisHistoryView.as_view(), name='analysis-history'),
    path('analysis/bulk', views.BulkAnalysisSubmitView.as_view(), name='analysis-bulk'),
    path('analysis/<uuid:analysis_id>', views.AnalysisDetailView.as_view(), name='analysis-detail'),
    path('analysis/<uuid:analysis_id>/status', views.AnalysisStatusView.as_view(), name='analysis-status'),
    path('analysis/<uuid:analysis_id>/explain', views.AnalysisExplainView.as_view(), name='analysis-explain'),
    path('analysis/<uuid:analysis_id>/flag', views.AnalysisFlagView.as_view(), name='analysis-flag'),
    path('analysis/<uuid:analysis_id>/export/pdf', views.AnalysisExportPDFView.as_view(), name='analysis-export-pdf'),
    path('analysis/<uuid:analysis_id>/export/csv', views.AnalysisExportCSVView.as_view(), name='analysis-export-csv'),
]
