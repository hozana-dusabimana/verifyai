import csv
import io
import json as _json

from django.db import connection
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from .models import AuditLog, Dataset, AlertRule, TrainingJob
from .serializers import (
    AuditLogSerializer,
    DatasetSerializer,
    DatasetUploadSerializer,
    AlertRuleSerializer,
    TrainingJobSerializer,
)


def _success(data=None, status_code=status.HTTP_200_OK, meta=None):
    body = {'success': True, 'data': data, 'error': None}
    if meta:
        body['meta'] = meta
    return Response(body, status=status_code)


def _error(message, status_code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'data': None, 'error': message}, status=status_code)


def log_audit(user, action, resource_type='', resource_id='', request=None, metadata=None):
    """Helper to create an audit log entry."""
    ip = ''
    user_agent = ''
    if request:
        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
        if ',' in ip:
            ip = ip.split(',')[0].strip()
        user_agent = request.META.get('HTTP_USER_AGENT', '')

    AuditLog.objects.create(
        user=user,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        ip_address=ip or None,
        user_agent=user_agent,
        metadata=metadata or {},
    )


class SystemHealthView(APIView):
    """Full system health: DB, Redis, Celery."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        health = {
            'database': 'healthy',
            'redis': 'unknown',
            'celery': 'unknown',
        }

        # Check database
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
        except Exception:
            health['database'] = 'unhealthy'

        # Check Redis
        try:
            from django.core.cache import cache
            cache.set('health_check', 'ok', 5)
            if cache.get('health_check') == 'ok':
                health['redis'] = 'healthy'
            else:
                health['redis'] = 'unhealthy'
        except Exception:
            health['redis'] = 'unavailable'

        # Check Celery
        try:
            from config.celery import app as celery_app
            inspector = celery_app.control.inspect(timeout=2)
            stats = inspector.stats()
            health['celery'] = 'healthy' if stats else 'eager mode'
        except Exception:
            health['celery'] = 'eager mode'

        # Check ML engine readiness
        try:
            from ml_engine.inference import get_model_info
            info = get_model_info()
            health['ml_engine'] = 'healthy' if info['all_ready'] else 'models missing'
        except Exception:
            health['ml_engine'] = 'unavailable'

        # Check media storage is writable
        try:
            from django.core.files.storage import default_storage
            from django.core.files.base import ContentFile
            probe = default_storage.save('health_check/probe.txt', ContentFile(b'ok'))
            default_storage.delete(probe)
            health['storage'] = 'healthy'
        except Exception:
            health['storage'] = 'unhealthy'

        critical_ok = health['database'] == 'healthy' and health['storage'] == 'healthy'
        overall = 'healthy' if critical_ok else 'degraded'
        return _success({'overall': overall, 'services': health})


class AuditLogListView(APIView):
    """Paginated audit trail of all system actions."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from rest_framework.pagination import PageNumberPagination

        logs = AuditLog.objects.select_related('user').all()

        # Filters
        user_id = request.query_params.get('user_id')
        if user_id:
            logs = logs.filter(user_id=user_id)
        action = request.query_params.get('action')
        if action:
            logs = logs.filter(action__icontains=action)
        resource_type = request.query_params.get('resource_type')
        if resource_type:
            logs = logs.filter(resource_type=resource_type)

        paginator = PageNumberPagination()
        paginator.page_size = 50
        page = paginator.paginate_queryset(logs, request)
        serializer = AuditLogSerializer(page, many=True)
        return _success(serializer.data, meta={
            'count': paginator.page.paginator.count,
            'next': paginator.get_next_link(),
            'previous': paginator.get_previous_link(),
        })


TEXT_COLUMNS = {'text', 'content', 'article', 'body', 'news'}
LABEL_COLUMNS = {'label', 'target', 'class', 'category', 'is_fake', 'fake', 'y'}


def _inspect_dataset(uploaded_file):
    """Read an uploaded CSV/JSON to count rows and validate it can train a model.

    Returns (record_count, error_message). error_message is None when valid.
    """
    name = (uploaded_file.name or '').lower()
    try:
        raw = uploaded_file.read()
        uploaded_file.seek(0)  # rewind so the file is fully saved afterwards
        text = raw.decode('utf-8-sig', errors='replace')
    except Exception as exc:
        return 0, f'Could not read file: {exc}'

    if name.endswith('.json'):
        try:
            data = _json.loads(text)
        except Exception as exc:
            return 0, f'Invalid JSON: {exc}'
        rows = data if isinstance(data, list) else data.get('data', data.get('records', []))
        if not isinstance(rows, list) or not rows:
            return 0, 'JSON must be a non-empty array of records.'
        headers = {str(k).lower() for k in rows[0].keys()} if isinstance(rows[0], dict) else set()
        record_count = len(rows)
    else:  # treat everything else as CSV
        reader = csv.reader(io.StringIO(text))
        try:
            header_row = next(reader)
        except StopIteration:
            return 0, 'File is empty.'
        headers = {h.lower().strip() for h in header_row}
        record_count = sum(1 for _ in reader)

    if record_count < 20:
        return record_count, f'Dataset has only {record_count} rows; at least 20 are required.'
    if not (headers & TEXT_COLUMNS):
        return record_count, (
            'Missing a text column. Include one of: ' + ', '.join(sorted(TEXT_COLUMNS)) + '.'
        )
    if not (headers & LABEL_COLUMNS):
        return record_count, (
            'Missing a label column. Include one of: ' + ', '.join(sorted(LABEL_COLUMNS)) + '.'
        )
    return record_count, None


class DatasetUploadView(APIView):
    """Upload new labeled training dataset."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = DatasetUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors)

        upload = serializer.validated_data['file']
        record_count, err = _inspect_dataset(upload)
        if err:
            return _error({'file': err})

        dataset = Dataset.objects.create(
            name=serializer.validated_data['name'],
            description=serializer.validated_data.get('description', ''),
            file=upload,
            uploaded_by=request.user,
            record_count=record_count,
        )

        log_audit(
            request.user, 'dataset_upload',
            resource_type='dataset', resource_id=dataset.id,
            request=request, metadata={'record_count': record_count},
        )

        return _success(DatasetSerializer(dataset).data, status_code=status.HTTP_201_CREATED)


class DatasetListView(APIView):
    """List all available training datasets."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        datasets = Dataset.objects.all()
        return _success(DatasetSerializer(datasets, many=True).data)


class DatasetDeleteView(APIView):
    """Delete a training dataset (file + record)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def delete(self, request, dataset_id):
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return _error('Dataset not found.', status.HTTP_404_NOT_FOUND)

        if dataset.file:
            dataset.file.delete(save=False)
        dataset.delete()

        log_audit(
            request.user, 'dataset_delete',
            resource_type='dataset', resource_id=dataset_id,
            request=request,
        )
        return _success({'detail': 'Dataset deleted.'})


class AlertRulesView(APIView):
    """Manage global alert threshold configuration."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        rules = AlertRule.objects.all()
        return _success(AlertRuleSerializer(rules, many=True).data)

    def put(self, request):
        serializer = AlertRuleSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors)

        rule, created = AlertRule.objects.update_or_create(
            name=serializer.validated_data['name'],
            defaults={
                'credibility_threshold': serializer.validated_data['credibility_threshold'],
                'is_active': serializer.validated_data.get('is_active', True),
            },
        )

        log_audit(
            request.user, 'alert_rule_update',
            resource_type='alert_rule', resource_id=rule.id,
            request=request,
        )

        return _success(AlertRuleSerializer(rule).data)


class AdminMetricsView(APIView):
    """Basic metrics endpoint."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from accounts.models import User
        from analysis.models import AnalysisResult, Article
        from alerts.models import Alert

        return _success({
            'total_users': User.objects.count(),
            'total_articles': Article.objects.count(),
            'total_analyses': AnalysisResult.objects.count(),
            'completed_analyses': AnalysisResult.objects.filter(status='completed').count(),
            'pending_analyses': AnalysisResult.objects.filter(status='pending').count(),
            'open_alerts': Alert.objects.filter(status='open').count(),
            'escalated_alerts': Alert.objects.filter(status='escalated').count(),
        })


class MLModelsView(APIView):
    """List models with accuracy metrics."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from ml_engine.inference import get_model_info
        return _success(get_model_info())


class MLRetrainView(APIView):
    """Trigger model retraining in a background thread, tracked via TrainingJob."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        from .training import has_active_job, start_training_job

        if has_active_job():
            return _error(
                'A training job is already running. Wait for it to finish before starting another.',
                status.HTTP_409_CONFLICT,
            )

        dataset = None
        dataset_id = request.data.get('dataset_id')
        if dataset_id:
            try:
                dataset = Dataset.objects.get(id=dataset_id)
            except Dataset.DoesNotExist:
                return _error('Dataset not found.', status.HTTP_404_NOT_FOUND)

        job = start_training_job(request.user, dataset=dataset)

        log_audit(
            request.user, 'model_retrain_triggered',
            resource_type='training_job', resource_id=job.id,
            request=request,
            metadata={'dataset_id': dataset_id},
        )

        return _success({
            'job_id': str(job.id),
            'status': job.status,
            'message': 'Model retraining started. Track progress on this page.',
        }, status_code=status.HTTP_202_ACCEPTED)


class TrainingJobListView(APIView):
    """Recent training jobs (most recent first)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        jobs = TrainingJob.objects.select_related('dataset', 'started_by').all()[:20]
        return _success(TrainingJobSerializer(jobs, many=True).data)


class TrainingJobDetailView(APIView):
    """Status of a single training job (polled by the dashboard)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, job_id):
        try:
            job = TrainingJob.objects.select_related('dataset', 'started_by').get(id=job_id)
        except TrainingJob.DoesNotExist:
            return _error('Training job not found.', status.HTTP_404_NOT_FOUND)
        return _success(TrainingJobSerializer(job).data)


class MLHealthView(APIView):
    """ML engine status and model verification."""

    def get(self, request):
        from ml_engine.inference import get_model_info
        info = get_model_info()
        return _success({
            'status': 'ready' if info['all_ready'] else 'models_missing',
            'models': info['models_available'],
            'metrics': info['metrics'],
        })


class MLPredictView(APIView):
    """Run ensemble classification on text (internal/testing)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        text = request.data.get('text', '')
        title = request.data.get('title', '')

        if not text or len(text) < 20:
            return _error('Text must be at least 20 characters.')

        from ml_engine.inference import predict_ensemble, get_model_info

        info = get_model_info()
        if not info['all_ready']:
            return _error('ML models not trained yet. Please train models first.')

        prediction = predict_ensemble(text, title)
        return _success(prediction)


# ─── Platform Statistics & Organization Oversight (Admin) ─────────────

class AdminStatisticsView(APIView):
    """Platform-wide statistics for the admin analytics view."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from datetime import timedelta
        from django.db.models import Avg, Count, Q
        from django.db.models.functions import TruncDate
        from django.utils import timezone
        from accounts.models import User
        from analysis.models import AnalysisResult
        from alerts.models import Alert

        days = int(request.query_params.get('days', 30))
        since = timezone.now() - timedelta(days=days)

        completed = AnalysisResult.objects.filter(status=AnalysisResult.Status.COMPLETED)

        # Users by role
        role_rows = User.objects.values('role').annotate(count=Count('id'))
        users_by_role = {r['role']: r['count'] for r in role_rows}

        # Classification breakdown
        cls = completed.aggregate(
            total=Count('id'),
            fake=Count('id', filter=Q(classification='FAKE')),
            real=Count('id', filter=Q(classification='REAL')),
            uncertain=Count('id', filter=Q(classification='UNCERTAIN')),
            avg_credibility=Avg('credibility_score'),
        )

        # Daily trend (real vs fake) over the window
        trend_rows = completed.filter(created_at__gte=since).annotate(
            date=TruncDate('created_at'),
        ).values('date').annotate(
            real_count=Count('id', filter=Q(classification='REAL')),
            fake_count=Count('id', filter=Q(classification='FAKE')),
            uncertain_count=Count('id', filter=Q(classification='UNCERTAIN')),
        ).order_by('date')
        trend = [
            {
                'date': r['date'].isoformat(),
                'real_count': r['real_count'],
                'fake_count': r['fake_count'],
                'uncertain_count': r['uncertain_count'],
            }
            for r in trend_rows
        ]

        # Top organizations by analysis volume
        org_rows = completed.exclude(
            article__user__organization='',
        ).values('article__user__organization').annotate(
            total=Count('id'),
            fake=Count('id', filter=Q(classification='FAKE')),
            avg_credibility=Avg('credibility_score'),
        ).order_by('-total')[:10]
        top_organizations = [
            {
                'organization': r['article__user__organization'],
                'total': r['total'],
                'fake': r['fake'],
                'average_credibility': round(r['avg_credibility'] or 0, 2),
            }
            for r in org_rows
        ]

        # Alerts breakdown
        alert_rows = Alert.objects.values('status').annotate(count=Count('id'))
        alerts_by_status = {r['status']: r['count'] for r in alert_rows}

        return _success({
            'window_days': days,
            'users_by_role': users_by_role,
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'classification': {
                'total': cls['total'],
                'fake': cls['fake'],
                'real': cls['real'],
                'uncertain': cls['uncertain'],
                'average_credibility': round(cls['avg_credibility'] or 0, 2),
            },
            'trend': trend,
            'top_organizations': top_organizations,
            'alerts_by_status': alerts_by_status,
            'new_analyses_window': completed.filter(created_at__gte=since).count(),
        })


class AdminOrganizationsView(APIView):
    """List every organization with aggregate activity (admin oversight)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.db.models import Avg, Count, Q
        from accounts.models import User
        from analysis.models import AnalysisResult
        from alerts.models import Alert

        org_names = (
            User.objects.exclude(organization='')
            .values_list('organization', flat=True)
            .distinct()
        )
        # Case-insensitive de-duplication keyed on the first-seen label.
        seen = {}
        for name in org_names:
            seen.setdefault(name.lower(), name)

        data = []
        for label in seen.values():
            members = User.objects.filter(organization__iexact=label)
            role_counts = {
                r['role']: r['count']
                for r in members.values('role').annotate(count=Count('id'))
            }
            results = AnalysisResult.objects.filter(
                article__user__in=members,
                status=AnalysisResult.Status.COMPLETED,
            )
            stats = results.aggregate(
                total=Count('id'),
                fake=Count('id', filter=Q(classification='FAKE')),
                avg_credibility=Avg('credibility_score'),
            )
            open_alerts = Alert.objects.filter(
                user__in=members, status__in=['open', 'escalated'],
            ).count()

            data.append({
                'organization': label,
                'member_count': members.count(),
                'government_count': role_counts.get('government', 0),
                'journalist_count': role_counts.get('journalist', 0),
                'citizen_count': role_counts.get('citizen', 0),
                'admin_count': role_counts.get('admin', 0),
                'total_analyses': stats['total'],
                'fake_count': stats['fake'],
                'average_credibility': round(stats['avg_credibility'] or 0, 2),
                'open_alerts': open_alerts,
            })

        data.sort(key=lambda d: d['total_analyses'], reverse=True)
        return _success(data)


class AdminOrganizationDetailView(APIView):
    """One organization's members with per-member activity. ?name=<org>."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.db.models import Avg, Count, Q
        from accounts.models import User
        from analysis.models import AnalysisResult
        from alerts.models import Alert

        name = (request.query_params.get('name') or '').strip()
        if not name:
            return _error('Query parameter "name" is required.')

        members = User.objects.filter(organization__iexact=name).order_by('role', '-created_at')
        if not members.exists():
            return _error('Organization not found.', status.HTTP_404_NOT_FOUND)

        member_data = []
        for m in members:
            results = AnalysisResult.objects.filter(
                article__user=m, status=AnalysisResult.Status.COMPLETED,
            )
            stats = results.aggregate(
                total=Count('id'),
                fake=Count('id', filter=Q(classification='FAKE')),
                real=Count('id', filter=Q(classification='REAL')),
                avg_credibility=Avg('credibility_score'),
            )
            open_alerts = Alert.objects.filter(
                user=m, status__in=['open', 'escalated'],
            ).count()
            member_data.append({
                'id': str(m.id),
                'full_name': m.full_name or m.email,
                'email': m.email,
                'role': m.role,
                'is_active': m.is_active,
                'created_at': m.created_at.isoformat(),
                'total_analyses': stats['total'],
                'fake_count': stats['fake'],
                'real_count': stats['real'],
                'average_credibility': round(stats['avg_credibility'] or 0, 2),
                'open_alerts': open_alerts,
            })

        return _success({
            'organization': members.first().organization,
            'member_count': members.count(),
            'members': member_data,
        })


class AdminUserActivityView(APIView):
    """A single user's profile, analytics, and recent searches/analyses."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, user_id):
        from django.db.models import Avg, Count, Q
        from accounts.models import User
        from analysis.models import AnalysisResult
        from alerts.models import Alert

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return _error('User not found.', status.HTTP_404_NOT_FOUND)

        results = AnalysisResult.objects.filter(article__user=user).select_related('article')
        completed = results.filter(status=AnalysisResult.Status.COMPLETED)
        stats = completed.aggregate(
            total=Count('id'),
            fake=Count('id', filter=Q(classification='FAKE')),
            real=Count('id', filter=Q(classification='REAL')),
            uncertain=Count('id', filter=Q(classification='UNCERTAIN')),
            avg_credibility=Avg('credibility_score'),
        )
        open_alerts = Alert.objects.filter(
            user=user, status__in=['open', 'escalated'],
        ).count()

        recent = []
        for r in results.order_by('-created_at')[:25]:
            recent.append({
                'id': str(r.id),
                'title': r.article.title or 'Untitled',
                'source_name': r.article.source_name or '—',
                'input_type': r.article.input_type,
                'classification': r.classification,
                'credibility_score': r.credibility_score,
                'status': r.status,
                'created_at': r.created_at.isoformat(),
            })

        return _success({
            'user': {
                'id': str(user.id),
                'full_name': user.full_name or user.email,
                'email': user.email,
                'role': user.role,
                'organization': user.organization or '—',
                'is_active': user.is_active,
                'is_email_verified': user.is_email_verified,
                'created_at': user.created_at.isoformat(),
            },
            'stats': {
                'total_analyzed': stats['total'],
                'fake_count': stats['fake'],
                'real_count': stats['real'],
                'uncertain_count': stats['uncertain'],
                'average_credibility': round(stats['avg_credibility'] or 0, 2),
                'open_alerts': open_alerts,
            },
            'recent_analyses': recent,
        })
