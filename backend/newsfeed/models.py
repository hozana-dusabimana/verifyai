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
        # Sourceless eyewitness reports that pass every automated check still
        # cannot be machine-verified; a moderator decides.
        REVIEW = 'review', 'Pending Review'
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

    # Editorial decision on a REVIEW post. Once set, the human verdict is
    # final: resync never re-derives the status of a reviewed post.
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reviewed_news_posts',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

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
        must overlap the story. A sourceless story that passes everything else
        (an eyewitness report) goes to editorial REVIEW instead of rejection.
        A post a moderator has already decided on is never re-derived."""
        if self.reviewed_by_id is not None:
            return self
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
                self.status, self.error_message = self._publication_verdict(result)

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

    def _publication_verdict(self, result):
        """Apply the publication gates to a REAL-classified post. Returns
        (status, reason): APPROVED with '' when every gate passes, REVIEW for
        sourceless eyewitness reports that pass everything else, REJECTED with
        the failed gate's reason otherwise."""
        min_consistency = getattr(settings, 'NEWSFEED_MIN_TITLE_CONSISTENCY', 0.05)
        consistency = result.headline_body_consistency
        if consistency is not None and consistency < min_consistency:
            return self.Status.REJECTED, (
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
            return self.Status.REJECTED, (
                'Story lacks verifiable specifics: it names no organization, '
                'place, or person that could be checked.'
            )

        if not self.source_url:
            return self.Status.REVIEW, (
                'No source link — held for editorial review. Eyewitness reports '
                'are checked by a moderator before publishing.'
            )
        if self.source_match_score is None:
            return self.Status.REJECTED, (
                'The cited source could not be retrieved for verification. '
                'Check the link and resubmit.'
            )
        min_match = getattr(settings, 'NEWSFEED_MIN_SOURCE_MATCH', 0.08)
        if self.source_match_score < min_match:
            return self.Status.REJECTED, (
                'The story does not match the content of the cited source. '
                'Cite the article the story is actually based on.'
            )
        return self.Status.APPROVED, ''

    def review(self, moderator, approve):
        """Record a moderator's decision on a post held for review."""
        self.reviewed_by = moderator
        self.reviewed_at = timezone.now()
        if approve:
            self.status = self.Status.APPROVED
            self.error_message = ''
            if not self.published_at:
                self.published_at = timezone.now()
        else:
            self.status = self.Status.REJECTED
            self.published_at = None
            self.error_message = 'Rejected by editorial review.'
        self.save(update_fields=[
            'status', 'error_message', 'published_at', 'reviewed_by', 'reviewed_at',
        ])
        return self
