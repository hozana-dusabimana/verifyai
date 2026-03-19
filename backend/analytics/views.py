from collections import Counter
from datetime import timedelta

from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasRolePermission
from analysis.models import AnalysisResult
from alerts.models import Alert
from .models import Report
from .serializers import ReportSerializer, ReportGenerateSerializer


def _success(data=None, status_code=status.HTTP_200_OK, meta=None):
    body = {'success': True, 'data': data, 'error': None}
    if meta:
        body['meta'] = meta
    return Response(body, status=status_code)


def _error(message, status_code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'data': None, 'error': message}, status=status_code)


class AnalyticsSummaryView(APIView):
    """Aggregate stats for a given date range."""
    required_permission = 'analytics_dashboard'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def get(self, request):
        results = AnalysisResult.objects.filter(
            article__user=request.user,
            status=AnalysisResult.Status.COMPLETED,
        )

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            results = results.filter(created_at__date__gte=date_from)
        if date_to:
            results = results.filter(created_at__date__lte=date_to)

        stats = results.aggregate(
            total=Count('id'),
            avg_credibility=Avg('credibility_score'),
            fake=Count('id', filter=Q(classification='FAKE')),
            real=Count('id', filter=Q(classification='REAL')),
            uncertain=Count('id', filter=Q(classification='UNCERTAIN')),
        )

        active_alerts = Alert.objects.filter(
            user=request.user, status__in=['open', 'escalated'],
        ).count()

        return _success({
            'total_analyzed': stats['total'],
            'average_credibility': round(stats['avg_credibility'] or 0, 2),
            'fake_count': stats['fake'],
            'real_count': stats['real'],
            'uncertain_count': stats['uncertain'],
            'active_alerts': active_alerts,
        })


class AnalyticsTrendsView(APIView):
    """Time-series: real vs fake counts over time."""
    required_permission = 'analytics_dashboard'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        since = timezone.now() - timedelta(days=days)

        results = AnalysisResult.objects.filter(
            article__user=request.user,
            status=AnalysisResult.Status.COMPLETED,
            created_at__gte=since,
        ).annotate(
            date=TruncDate('created_at'),
        ).values('date').annotate(
            real_count=Count('id', filter=Q(classification='REAL')),
            fake_count=Count('id', filter=Q(classification='FAKE')),
            uncertain_count=Count('id', filter=Q(classification='UNCERTAIN')),
        ).order_by('date')

        return _success(list(results))


class AnalyticsSourcesView(APIView):
    """Per-domain credibility scores and counts."""
    required_permission = 'analytics_dashboard'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def get(self, request):
        results = AnalysisResult.objects.filter(
            article__user=request.user,
            status=AnalysisResult.Status.COMPLETED,
        ).exclude(
            article__source_name='',
        ).values(
            'article__source_name',
        ).annotate(
            average_credibility=Avg('credibility_score'),
            article_count=Count('id'),
        ).order_by('average_credibility')[:50]

        data = [
            {
                'source_name': r['article__source_name'],
                'average_credibility': round(r['average_credibility'], 2),
                'article_count': r['article_count'],
            }
            for r in results
        ]
        return _success(data)


class AnalyticsKeywordsView(APIView):
    """Top keywords in flagged vs credible articles."""
    required_permission = 'analytics_dashboard'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def get(self, request):
        fake_results = AnalysisResult.objects.filter(
            article__user=request.user,
            classification='FAKE',
        ).values_list('top_keywords', flat=True)

        real_results = AnalysisResult.objects.filter(
            article__user=request.user,
            classification='REAL',
        ).values_list('top_keywords', flat=True)

        fake_keywords = Counter()
        for keywords in fake_results:
            if keywords:
                fake_keywords.update(keywords)

        real_keywords = Counter()
        for keywords in real_results:
            if keywords:
                real_keywords.update(keywords)

        return _success({
            'fake_keywords': [
                {'keyword': k, 'count': c, 'context': 'fake'}
                for k, c in fake_keywords.most_common(30)
            ],
            'real_keywords': [
                {'keyword': k, 'count': c, 'context': 'real'}
                for k, c in real_keywords.most_common(30)
            ],
        })


class AnalyticsTopicsView(APIView):
    """Topic distribution of analyzed content."""
    required_permission = 'analytics_dashboard'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def get(self, request):
        # Simple keyword-based topic extraction (placeholder)
        results = AnalysisResult.objects.filter(
            article__user=request.user,
            status=AnalysisResult.Status.COMPLETED,
        ).select_related('article')

        topic_counter = Counter()
        for result in results[:500]:
            title = result.article.title.lower()
            # Basic topic detection from title keywords
            for keyword in ['politics', 'health', 'science', 'technology', 'economy',
                            'sports', 'entertainment', 'climate', 'education', 'security']:
                if keyword in title:
                    topic_counter[keyword] += 1

        data = [{'topic': t, 'count': c} for t, c in topic_counter.most_common(20)]
        return _success(data)


# ─── Reports ──────────────────────────────────────────────────────────

class ReportGenerateView(APIView):
    """Queue report generation job."""
    required_permission = 'export_reports'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def post(self, request):
        serializer = ReportGenerateSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors)

        report = Report.objects.create(
            user=request.user,
            title=serializer.validated_data['title'],
            report_format=serializer.validated_data['report_format'],
            date_from=serializer.validated_data.get('date_from'),
            date_to=serializer.validated_data.get('date_to'),
        )

        # In production, this would trigger a Celery task
        # For now, mark as completed immediately
        report.status = Report.Status.COMPLETED
        report.save(update_fields=['status'])

        return _success(ReportSerializer(report).data, status_code=status.HTTP_201_CREATED)


class ReportDetailView(APIView):
    required_permission = 'export_reports'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def get(self, request, report_id):
        try:
            report = Report.objects.get(id=report_id, user=request.user)
        except Report.DoesNotExist:
            return _error('Report not found.', status.HTTP_404_NOT_FOUND)
        return _success(ReportSerializer(report).data)


class ReportListView(APIView):
    required_permission = 'export_reports'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def get(self, request):
        reports = Report.objects.filter(user=request.user)
        return _success(ReportSerializer(reports, many=True).data)
