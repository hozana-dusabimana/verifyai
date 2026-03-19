import uuid

from django.conf import settings
from django.db import models


class Article(models.Model):
    """Stores raw article content submitted for analysis."""

    class InputType(models.TextChoices):
        TEXT = 'text', 'Text'
        URL = 'url', 'URL'
        FILE = 'file', 'File'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='articles')
    input_type = models.CharField(max_length=10, choices=InputType.choices)
    original_url = models.URLField(max_length=2048, blank=True)
    title = models.CharField(max_length=500, blank=True)
    author = models.CharField(max_length=255, blank=True)
    source_name = models.CharField(max_length=255, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    content = models.TextField()
    uploaded_file = models.FileField(upload_to='article_uploads/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'articles'
        ordering = ['-created_at']

    def __str__(self):
        return self.title or f'Article {self.id}'


class AnalysisResult(models.Model):
    """Stores complete ML pipeline output for each article."""

    class Classification(models.TextChoices):
        FAKE = 'FAKE', 'Fake'
        REAL = 'REAL', 'Real'
        UNCERTAIN = 'UNCERTAIN', 'Uncertain'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    article = models.OneToOneField(Article, on_delete=models.CASCADE, related_name='result')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    current_stage = models.IntegerField(default=0)
    current_stage_name = models.CharField(max_length=50, blank=True)

    # Model scores
    naive_bayes_score = models.FloatField(null=True, blank=True)
    lstm_score = models.FloatField(null=True, blank=True)
    distilbert_score = models.FloatField(null=True, blank=True)
    ensemble_score = models.FloatField(null=True, blank=True)

    # Final result
    credibility_score = models.FloatField(null=True, blank=True)
    classification = models.CharField(max_length=20, choices=Classification.choices, blank=True)
    confidence = models.FloatField(null=True, blank=True)

    # NLP features
    sentiment_score = models.FloatField(null=True, blank=True)
    emotional_tone = models.CharField(max_length=50, blank=True)
    sensationalism_score = models.FloatField(null=True, blank=True)
    headline_body_consistency = models.FloatField(null=True, blank=True)

    # Explainability
    top_keywords = models.JSONField(default=list, blank=True)
    flagging_reasons = models.JSONField(default=list, blank=True)
    feature_vector = models.JSONField(default=dict, blank=True)

    # Flags
    is_flagged_for_review = models.BooleanField(default=False)
    flagged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='flagged_results',
    )

    # Celery task tracking
    celery_task_id = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'analysis_results'
        ordering = ['-created_at']

    def __str__(self):
        return f'Result for {self.article_id} — {self.classification}'
