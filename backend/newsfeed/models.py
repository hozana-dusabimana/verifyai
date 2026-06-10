import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from analysis.models import AnalysisResult


class NewsPost(models.Model):
    """A community-submitted news item that is auto-verified by the ML
    pipeline. Posts classified REAL are auto-approved and surface in the
    public newsletter feed; FAKE/UNCERTAIN posts are rejected and stay
    private to their author."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='news_posts',
    )
    title = models.CharField(max_length=500)
    content = models.TextField()
    source_name = models.CharField(max_length=255, blank=True)
    author = models.CharField(max_length=255, blank=True)

    # Link to the underlying ML analysis that gated approval.
    analysis_result = models.OneToOneField(
        AnalysisResult, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='news_post',
    )

    # Denormalised verdict for fast feed queries (mirrors analysis_result).
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    classification = models.CharField(max_length=20, blank=True)
    credibility_score = models.FloatField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'news_posts'
        ordering = ['-created_at']

    def __str__(self):
        return self.title or f'NewsPost {self.id}'

    def sync_from_result(self, save=True):
        """Derive the post's status from its analysis result. REAL → approved
        (published to the feed); FAKE/UNCERTAIN → rejected; failed analysis →
        failed. A REAL verdict is additionally gated on headline-body
        consistency so a credible body cannot be published under an unrelated
        or nonsense headline (the verdict only scores the body)."""
        result = self.analysis_result
        if result is None or result.status == AnalysisResult.Status.FAILED:
            self.status = self.Status.FAILED
            self.classification = ''
            self.credibility_score = None
            self.error_message = getattr(result, 'error_message', '') or 'Analysis failed.'
        else:
            self.classification = result.classification
            self.credibility_score = result.credibility_score
            self.error_message = ''
            min_consistency = getattr(settings, 'NEWSFEED_MIN_TITLE_CONSISTENCY', 0.05)
            consistency = result.headline_body_consistency
            if result.classification != AnalysisResult.Classification.REAL:
                self.status = self.Status.REJECTED
                self.published_at = None
            elif consistency is not None and consistency < min_consistency:
                self.status = self.Status.REJECTED
                self.published_at = None
                self.error_message = (
                    'Headline does not match the story content. The AI verified the '
                    'story body, but the headline appears unrelated to it.'
                )
            else:
                self.status = self.Status.APPROVED
                if not self.published_at:
                    self.published_at = timezone.now()
        if save:
            self.save(update_fields=[
                'status', 'classification', 'credibility_score',
                'error_message', 'published_at',
            ])
        return self
