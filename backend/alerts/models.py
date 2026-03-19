import uuid

from django.conf import settings
from django.db import models


class Alert(models.Model):
    """Auto-created when credibility score falls below threshold."""

    class Severity(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        REVIEWED = 'reviewed', 'Reviewed'
        ESCALATED = 'escalated', 'Escalated'
        RESOLVED = 'resolved', 'Resolved'
        DISMISSED = 'dismissed', 'Dismissed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis_result = models.ForeignKey(
        'analysis.AnalysisResult', on_delete=models.CASCADE, related_name='alerts',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='alerts',
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_alerts',
    )
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'alerts'
        ordering = ['-created_at']

    def __str__(self):
        return f'Alert {self.id} — {self.severity} — {self.status}'


class NotificationPreference(models.Model):
    """User notification preferences."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preferences',
    )
    email_on_high_risk = models.BooleanField(default=True)
    email_on_analysis_complete = models.BooleanField(default=False)
    alert_threshold = models.IntegerField(default=30)
    email_frequency = models.CharField(
        max_length=20,
        choices=[('immediate', 'Immediate'), ('daily', 'Daily Digest'), ('weekly', 'Weekly Digest')],
        default='immediate',
    )

    class Meta:
        db_table = 'notification_preferences'
