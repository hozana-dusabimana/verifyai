from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Alert, NotificationPreference
from .serializers import AlertSerializer, AlertDetailSerializer, NotificationPreferenceSerializer


def _success(data=None, status_code=status.HTTP_200_OK, meta=None):
    body = {'success': True, 'data': data, 'error': None}
    if meta:
        body['meta'] = meta
    return Response(body, status=status_code)


def _error(message, status_code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'data': None, 'error': message}, status=status_code)


class AlertListView(APIView):
    """List all alerts for the current user with filters."""

    def get(self, request):
        from rest_framework.pagination import PageNumberPagination

        alerts = Alert.objects.select_related(
            'analysis_result', 'analysis_result__article',
        ).filter(user=request.user)

        # Filters
        alert_status = request.query_params.get('status')
        if alert_status:
            alerts = alerts.filter(status=alert_status)
        severity = request.query_params.get('severity')
        if severity:
            alerts = alerts.filter(severity=severity)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(alerts, request)
        serializer = AlertSerializer(page, many=True)
        return _success(serializer.data, meta={
            'count': paginator.page.paginator.count,
            'next': paginator.get_next_link(),
            'previous': paginator.get_previous_link(),
        })


class AlertDetailView(APIView):
    def get(self, request, alert_id):
        try:
            alert = Alert.objects.select_related(
                'analysis_result', 'analysis_result__article',
            ).get(id=alert_id, user=request.user)
        except Alert.DoesNotExist:
            return _error('Alert not found.', status.HTTP_404_NOT_FOUND)
        return _success(AlertDetailSerializer(alert).data)


class AlertResolveView(APIView):
    def put(self, request, alert_id):
        try:
            alert = Alert.objects.get(id=alert_id, user=request.user)
        except Alert.DoesNotExist:
            return _error('Alert not found.', status.HTTP_404_NOT_FOUND)
        alert.status = Alert.Status.RESOLVED
        alert.resolved_at = timezone.now()
        alert.save(update_fields=['status', 'resolved_at', 'updated_at'])
        return _success({'detail': 'Alert resolved.'})


class AlertEscalateView(APIView):
    def put(self, request, alert_id):
        try:
            alert = Alert.objects.get(id=alert_id, user=request.user)
        except Alert.DoesNotExist:
            return _error('Alert not found.', status.HTTP_404_NOT_FOUND)
        alert.status = Alert.Status.ESCALATED
        alert.save(update_fields=['status', 'updated_at'])
        return _success({'detail': 'Alert escalated.'})


class AlertDismissView(APIView):
    def delete(self, request, alert_id):
        try:
            alert = Alert.objects.get(id=alert_id, user=request.user)
        except Alert.DoesNotExist:
            return _error('Alert not found.', status.HTTP_404_NOT_FOUND)
        alert.status = Alert.Status.DISMISSED
        alert.save(update_fields=['status', 'updated_at'])
        return _success({'detail': 'Alert dismissed.'})


class AlertSettingsView(APIView):
    def get(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return _success(NotificationPreferenceSerializer(prefs).data)

    def put(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        if not serializer.is_valid():
            return _error(serializer.errors)
        serializer.save()
        return _success(serializer.data)
