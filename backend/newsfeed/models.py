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

    # Source corroboration: the cited link, how well its page text matches the
    # story (TF-IDF cosine; None = page unreachable), and how many specific
    # named entities (org/place/person) the story contains.
    source_url = models.URLField(max_length=500, blank=True)
    source_match_score = models.FloatField(null=True, blank=True)
    named_entity_count = models.IntegerField(null=True, blank=True)

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
        failed. A REAL verdict is additionally gated on (1) headline-body
        consistency, since the verdict only scores the body; (2) specificity —
        a story naming no organization, place, or person is unverifiable; and
        (3) source corroboration — the cited link must resolve and its page
        must overlap the story."""
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
            if result.classification != AnalysisResult.Classification.REAL:
                self.status = self.Status.REJECTED
            else:
                self.error_message = self._publication_block_reason(result)
                self.status = self.Status.REJECTED if self.error_message else self.Status.APPROVED

            if self.status == self.Status.APPROVED:
                if not self.published_at:
                    self.published_at = timezone.now()
            else:
                self.published_at = None
        if save:
            self.save(update_fields=[
                'status', 'classification', 'credibility_score',
                'error_message', 'published_at', 'named_entity_count',
            ])
        return self

    def _publication_block_reason(self, result):
        """Apply the publication gates to a REAL-classified post. Returns a
        human-readable reason when the post must not publish, else ''."""
        min_consistency = getattr(settings, 'NEWSFEED_MIN_TITLE_CONSISTENCY', 0.05)
        consistency = result.headline_body_consistency
        if consistency is not None and consistency < min_consistency:
            return (
                'Headline does not match the story content. The AI verified the '
                'story body, but the headline appears unrelated to it.'
            )

        # Lazily backfill the entity count for posts created before this gate
        # existed (resync recomputes from stored content; no network needed).
        if self.named_entity_count is None:
            from .verification import count_named_entities
            self.named_entity_count = count_named_entities(f'{self.title}. {self.content}')
        # None here means the NER model is unavailable — fail open rather than
        # block the whole wire on an infrastructure problem.
        if self.named_entity_count == 0:
            return (
                'Story lacks verifiable specifics: it names no organization, '
                'place, or person that could be checked.'
            )

        if not self.source_url:
            return 'No source link provided. Stories must cite a source URL.'
        if self.source_match_score is None:
            return (
                'The cited source could not be retrieved for verification. '
                'Check the link and resubmit.'
            )
        min_match = getattr(settings, 'NEWSFEED_MIN_SOURCE_MATCH', 0.08)
        if self.source_match_score < min_match:
            return (
                'The story does not match the content of the cited source. '
                'Cite the article the story is actually based on.'
            )
        return ''
