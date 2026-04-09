from django.db import connection
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from .models import AuditLog, Dataset, AlertRule
from .serializers import (
    AuditLogSerializer,
    DatasetSerializer,
    DatasetUploadSerializer,
    AlertRuleSerializer,
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
            health['celery'] = 'healthy' if stats else 'no workers'
        except Exception:
            health['celery'] = 'unavailable'

        overall = 'healthy' if health['database'] == 'healthy' else 'degraded'
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


class DatasetUploadView(APIView):
    """Upload new labeled training dataset."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = DatasetUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors)

        dataset = Dataset.objects.create(
            name=serializer.validated_data['name'],
            description=serializer.validated_data.get('description', ''),
            file=serializer.validated_data['file'],
            uploaded_by=request.user,
        )

        log_audit(
            request.user, 'dataset_upload',
            resource_type='dataset', resource_id=dataset.id,
            request=request,
        )

        return _success(DatasetSerializer(dataset).data, status_code=status.HTTP_201_CREATED)


class DatasetListView(APIView):
    """List all available training datasets."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        datasets = Dataset.objects.all()
        return _success(DatasetSerializer(datasets, many=True).data)


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
    """Trigger model retraining with specified dataset."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        dataset_id = request.data.get('dataset_id')
        dataset_path = None

        if dataset_id:
            try:
                dataset = Dataset.objects.get(id=dataset_id)
                dataset_path = dataset.file.path
            except Dataset.DoesNotExist:
                return _error('Dataset not found.', status.HTTP_404_NOT_FOUND)

        # Trigger async retraining
        from analysis.tasks_ml import run_model_training
        task = run_model_training.delay(dataset_path)

        log_audit(
            request.user, 'model_retrain_triggered',
            resource_type='ml_model',
            request=request,
            metadata={'dataset_id': dataset_id, 'task_id': task.id},
        )

        return _success({
            'task_id': task.id,
            'message': 'Model retraining started. This may take several minutes.',
        })


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
