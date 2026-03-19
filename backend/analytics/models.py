import uuid

from django.conf import settings
from django.db import models


class Report(models.Model):
    """Generated reports (PDF/CSV)."""

    class Format(models.TextChoices):
        PDF = 'pdf', 'PDF'
        CSV = 'csv', 'CSV'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        GENERATING = 'generating', 'Generating'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports')
    title = models.CharField(max_length=255)
    report_format = models.CharField(max_length=10, choices=Format.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    file = models.FileField(upload_to='reports/', blank=True, null=True)
    date_from = models.DateField(null=True, blank=True)
    date_to = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reports'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.report_format})'
