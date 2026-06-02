from collections import Counter
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework.permissions import AllowAny

from accounts.permissions import HasRolePermission
from analysis.models import AnalysisResult
from alerts.models import Alert

User = get_user_model()


def _org_users_qs(user):
    """Users in caller's organization. Falls back to caller alone when org is empty."""
    if not user.organization:
        return User.objects.filter(id=user.id)
    return User.objects.filter(organization__iexact=user.organization)


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


# Note: report generation/list/detail endpoints were removed — the Analytics
# page now produces CSV/PDF reports client-side. The Report model/table is
# retained to avoid a destructive migration.


class PlatformStatsView(APIView):
    """Public endpoint returning aggregate platform statistics for the landing page."""
    permission_classes = [AllowAny]

    def get(self, request):
        completed = AnalysisResult.objects.filter(status=AnalysisResult.Status.COMPLETED)
        total = completed.count()
        agg = completed.aggregate(avg_cred=Avg('credibility_score'))
        accuracy = round(agg['avg_cred'] or 0, 1)

        return _success({
            'total_articles_analyzed': total,
            'detection_accuracy': accuracy,
            'average_analysis_time': 2.1,
        })


# ─── Org-scoped (Government / Admin) ──────────────────────────────────

class OrgSummaryView(APIView):
    """Aggregate stats across all users sharing the caller's organization."""
    required_permission = 'view_org_analyses'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def get(self, request):
        org_users = _org_users_qs(request.user)
        results = AnalysisResult.objects.filter(
            article__user__in=org_users,
            status=AnalysisResult.Status.COMPLETED,
        )
        stats = results.aggregate(
            total=Count('id'),
            avg_credibility=Avg('credibility_score'),
            fake=Count('id', filter=Q(classification='FAKE')),
            real=Count('id', filter=Q(classification='REAL')),
            uncertain=Count('id', filter=Q(classification='UNCERTAIN')),
        )

        open_alerts = Alert.objects.filter(
            user__in=org_users, status__in=['open', 'escalated'],
        ).count()

        thirty_ago = timezone.now() - timedelta(days=30)
        active_users = AnalysisResult.objects.filter(
            article__user__in=org_users,
            created_at__gte=thirty_ago,
        ).values('article__user').distinct().count()

        return _success({
            'organization': request.user.organization or '(personal)',
            'org_total': stats['total'],
            'org_average_credibility': round(stats['avg_credibility'] or 0, 2),
            'org_fake_count': stats['fake'],
            'org_real_count': stats['real'],
            'org_uncertain_count': stats['uncertain'],
            'open_alerts': open_alerts,
            'active_users': active_users,
        })


class OrgFeedView(APIView):
    """Bundled org feed: escalation queue, top FAKE sources, topic mix, 30-day fake heatmap."""
    required_permission = 'view_org_analyses'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def get(self, request):
        org_users = _org_users_qs(request.user)
        thirty_ago = timezone.now() - timedelta(days=30)

        escalation_alerts = Alert.objects.select_related(
            'analysis_result', 'analysis_result__article', 'user',
        ).filter(
            user__in=org_users,
            status__in=['open', 'escalated'],
        ).order_by('-created_at')[:20]

        escalation_queue = []
        for a in escalation_alerts:
            article = a.analysis_result.article
            escalation_queue.append({
                'alert_id': str(a.id),
                'analysis_id': str(a.analysis_result.id),
                'title': article.title or 'Untitled',
                'source_name': article.source_name or '-',
                'submitted_by': a.user.full_name or a.user.email,
                'severity': a.severity,
                'status': a.status,
                'credibility_score': a.analysis_result.credibility_score,
                'classification': a.analysis_result.classification,
                'created_at': a.created_at.isoformat(),
            })

        source_rows = AnalysisResult.objects.filter(
            article__user__in=org_users,
            classification='FAKE',
            created_at__gte=thirty_ago,
        ).exclude(article__source_name='').values(
            'article__source_name',
        ).annotate(
            fake_count=Count('id'),
            avg_credibility=Avg('credibility_score'),
        ).order_by('-fake_count')[:10]

        top_sources_by_fake = [
            {
                'source_name': r['article__source_name'],
                'fake_count': r['fake_count'],
                'average_credibility': round(r['avg_credibility'] or 0, 2),
            }
            for r in source_rows
        ]

        recent_results = AnalysisResult.objects.filter(
            article__user__in=org_users,
            status=AnalysisResult.Status.COMPLETED,
            created_at__gte=thirty_ago,
        ).select_related('article')[:1000]

        topic_counter = Counter()
        topics = ['politics', 'health', 'science', 'technology', 'economy',
                  'sports', 'entertainment', 'climate', 'education', 'security']
        for r in recent_results:
            t = (r.article.title or '').lower()
            for kw in topics:
                if kw in t:
                    topic_counter[kw] += 1

        topic_distribution = [
            {'topic': t, 'count': c} for t, c in topic_counter.most_common(10)
        ]

        heatmap_rows = AnalysisResult.objects.filter(
            article__user__in=org_users,
            classification='FAKE',
            created_at__gte=thirty_ago,
        ).annotate(date=TruncDate('created_at')).values('date').annotate(
            fake_count=Count('id'),
        ).order_by('date')

        heatmap = [
            {'date': r['date'].isoformat(), 'fake_count': r['fake_count']}
            for r in heatmap_rows
        ]

        return _success({
            'escalation_queue': escalation_queue,
            'top_sources_by_fake': top_sources_by_fake,
            'topic_distribution': topic_distribution,
            'heatmap': heatmap,
        })


class OrgMembersPerformanceView(APIView):
    """Per-member evaluation for the government management console."""
    required_permission = 'view_org_analyses'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def get(self, request):
        org_users = _org_users_qs(request.user).order_by('role', '-created_at')
        thirty_ago = timezone.now() - timedelta(days=30)

        members = []
        for u in org_users:
            results = AnalysisResult.objects.filter(
                article__user=u, status=AnalysisResult.Status.COMPLETED,
            )
            stats = results.aggregate(
                total=Count('id'),
                fake=Count('id', filter=Q(classification='FAKE')),
                real=Count('id', filter=Q(classification='REAL')),
                avg_credibility=Avg('credibility_score'),
            )
            recent_count = results.filter(created_at__gte=thirty_ago).count()
            open_alerts = Alert.objects.filter(
                user=u, status__in=['open', 'escalated'],
            ).count()
            last = results.order_by('-created_at').values_list('created_at', flat=True).first()

            members.append({
                'id': str(u.id),
                'full_name': u.full_name or u.email,
                'email': u.email,
                'role': u.role,
                'is_active': u.is_active,
                'total_analyzed': stats['total'],
                'recent_analyzed': recent_count,
                'fake_count': stats['fake'],
                'real_count': stats['real'],
                'average_credibility': round(stats['avg_credibility'] or 0, 2),
                'open_alerts': open_alerts,
                'last_active': last.isoformat() if last else None,
            })

        return _success({
            'organization': request.user.organization or '(personal)',
            'members': members,
        })


class MyOrgView(APIView):
    """Read-only organization overview for any member (e.g. journalists)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.organization or not user.organization.strip():
            return _success({'has_org': False})

        org_users = User.objects.filter(organization__iexact=user.organization)
        thirty_ago = timezone.now() - timedelta(days=30)

        results = AnalysisResult.objects.filter(
            article__user__in=org_users,
            status=AnalysisResult.Status.COMPLETED,
        )
        stats = results.aggregate(
            total=Count('id'),
            fake=Count('id', filter=Q(classification='FAKE')),
            avg_credibility=Avg('credibility_score'),
        )
        recent_total = results.filter(created_at__gte=thirty_ago).count()
        open_alerts = Alert.objects.filter(
            user__in=org_users, status__in=['open', 'escalated'],
        ).count()

        role_counts = {
            r['role']: r['count']
            for r in org_users.values('role').annotate(count=Count('id'))
        }

        # Top colleagues by volume (excluding the caller)
        colleague_rows = AnalysisResult.objects.filter(
            article__user__in=org_users.exclude(id=user.id),
            status=AnalysisResult.Status.COMPLETED,
        ).values(
            'article__user', 'article__user__first_name',
            'article__user__last_name', 'article__user__email',
        ).annotate(
            total=Count('id'),
            avg_credibility=Avg('credibility_score'),
        ).order_by('-total')[:5]

        colleagues = [
            {
                'name': (f"{r['article__user__first_name']} {r['article__user__last_name']}".strip()
                         or r['article__user__email']),
                'total': r['total'],
                'average_credibility': round(r['avg_credibility'] or 0, 2),
            }
            for r in colleague_rows
        ]

        return _success({
            'has_org': True,
            'organization': user.organization,
            'member_count': org_users.count(),
            'journalist_count': role_counts.get('journalist', 0),
            'government_count': role_counts.get('government', 0),
            'org_total_analyses': stats['total'],
            'org_recent_analyses': recent_total,
            'org_fake_count': stats['fake'],
            'org_average_credibility': round(stats['avg_credibility'] or 0, 2),
            'org_open_alerts': open_alerts,
            'colleagues': colleagues,
        })


class OrgAlertActionView(APIView):
    """Resolve or escalate any alert in caller's organization."""
    required_permission = 'view_org_analyses'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def put(self, request, alert_id):
        action = request.data.get('action')
        if action not in ('resolve', 'escalate'):
            return _error("action must be 'resolve' or 'escalate'.")

        org_users = _org_users_qs(request.user)
        try:
            alert = Alert.objects.get(id=alert_id, user__in=org_users)
        except Alert.DoesNotExist:
            return _error('Alert not found in your organization.', status.HTTP_404_NOT_FOUND)

        if action == 'resolve':
            alert.status = Alert.Status.RESOLVED
            alert.resolved_at = timezone.now()
            alert.save(update_fields=['status', 'resolved_at', 'updated_at'])
        else:
            alert.status = Alert.Status.ESCALATED
            alert.save(update_fields=['status', 'updated_at'])

        return _success({'detail': f'Alert {action}d.'})
