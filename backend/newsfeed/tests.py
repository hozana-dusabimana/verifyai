from django.contrib.auth import get_user_model
from django.test import TestCase

from analysis.models import Article, AnalysisResult

from .models import NewsPost
from .serializers import NewsPostSubmitSerializer


def make_post(user, classification, consistency, credibility=90.0,
              source_url='https://example.com/article', source_match=0.5,
              entities=3, title='t', content=None):
    content = content if content is not None else 'c' * 60
    article = Article.objects.create(
        user=user, input_type=Article.InputType.TEXT,
        title=title, content=content,
    )
    result = AnalysisResult.objects.create(
        article=article,
        status=AnalysisResult.Status.COMPLETED,
        classification=classification,
        credibility_score=credibility,
        headline_body_consistency=consistency,
    )
    return NewsPost.objects.create(
        user=user, title=title, content=content,
        source_url=source_url, source_match_score=source_match,
        named_entity_count=entities, analysis_result=result,
    )


class SyncFromResultTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username='tester', email='tester@example.com', password='x',
        )

    def test_real_with_all_gates_passing_is_approved(self):
        post = make_post(self.user, 'REAL', consistency=0.3)
        post.sync_from_result()
        self.assertEqual(post.status, NewsPost.Status.APPROVED)
        self.assertIsNotNone(post.published_at)

    def test_real_with_unrelated_headline_is_rejected(self):
        post = make_post(self.user, 'REAL', consistency=0.0)
        post.sync_from_result()
        self.assertEqual(post.status, NewsPost.Status.REJECTED)
        self.assertIsNone(post.published_at)
        self.assertIn('Headline does not match', post.error_message)

    def test_real_without_consistency_score_is_approved(self):
        post = make_post(self.user, 'REAL', consistency=None)
        post.sync_from_result()
        self.assertEqual(post.status, NewsPost.Status.APPROVED)

    def test_fake_is_rejected_regardless_of_gates(self):
        post = make_post(self.user, 'FAKE', consistency=0.9, credibility=10.0)
        post.sync_from_result()
        self.assertEqual(post.status, NewsPost.Status.REJECTED)

    def test_zero_named_entities_is_rejected(self):
        post = make_post(self.user, 'REAL', consistency=0.3, entities=0)
        post.sync_from_result()
        self.assertEqual(post.status, NewsPost.Status.REJECTED)
        self.assertIn('verifiable specifics', post.error_message)

    def test_unknown_entity_count_fails_open(self):
        # None = NER model unavailable; must not block the wire. Content names
        # a real place so the lazy backfill (if the model IS available) also
        # passes.
        post = make_post(
            self.user, 'REAL', consistency=0.3, entities=None,
            content='Officials in Kigali, Rwanda announced new measures today. ' * 2,
        )
        post.sync_from_result()
        self.assertEqual(post.status, NewsPost.Status.APPROVED)

    def test_missing_source_url_is_rejected(self):
        post = make_post(self.user, 'REAL', consistency=0.3, source_url='', source_match=None)
        post.sync_from_result()
        self.assertEqual(post.status, NewsPost.Status.REJECTED)
        self.assertIn('source link', post.error_message.lower())

    def test_unreachable_source_is_rejected(self):
        post = make_post(self.user, 'REAL', consistency=0.3, source_match=None)
        post.sync_from_result()
        self.assertEqual(post.status, NewsPost.Status.REJECTED)
        self.assertIn('could not be retrieved', post.error_message)

    def test_source_mismatch_is_rejected(self):
        post = make_post(self.user, 'REAL', consistency=0.3, source_match=0.01)
        post.sync_from_result()
        self.assertEqual(post.status, NewsPost.Status.REJECTED)
        self.assertIn('does not match the content of the cited source', post.error_message)

    def test_resync_unpublishes_legacy_post_without_source(self):
        # Simulates a post approved before the corroboration gates existed:
        # generic content, no source, no stored entity count.
        post = make_post(
            self.user, 'REAL', consistency=0.3,
            source_url='', source_match=None, entities=None,
            title='Regional transport authority expands weekend bus service',
            content=(
                'The regional transport authority announced an expansion of weekend '
                'bus service across three districts starting next month.'
            ),
        )
        NewsPost.objects.filter(id=post.id).update(status=NewsPost.Status.APPROVED)
        post.refresh_from_db()
        post.sync_from_result()
        self.assertEqual(post.status, NewsPost.Status.REJECTED)


class SubmitSerializerTests(TestCase):
    BASE = {
        'title': 'A perfectly reasonable headline',
        'content': 'c' * 60,
        'source_url': 'https://example.com/article',
    }

    def _errors(self, **overrides):
        data = {**self.BASE, **overrides}
        data = {k: v for k, v in data.items() if v is not None}
        s = NewsPostSubmitSerializer(data=data)
        s.is_valid()
        return s.errors

    def test_valid_submission_passes(self):
        self.assertEqual(self._errors(), {})

    def test_paragraph_length_title_is_rejected(self):
        errs = self._errors(title='Lorem ipsum ' * 40)
        self.assertTrue(any('too long' in str(e) for e in errs.get('title', [])))

    def test_too_short_title_is_rejected(self):
        errs = self._errors(title='News')
        self.assertTrue(any('too short' in str(e) for e in errs.get('title', [])))

    def test_missing_source_url_is_rejected(self):
        errs = self._errors(source_url=None)
        self.assertTrue(any('source link is required' in str(e) for e in errs.get('source_url', [])))

    def test_invalid_source_url_is_rejected(self):
        errs = self._errors(source_url='not-a-url')
        self.assertTrue(any('valid source URL' in str(e) for e in errs.get('source_url', [])))


class VerificationHelperTests(TestCase):
    def test_specific_text_has_entities(self):
        from .verification import count_named_entities
        n = count_named_entities(
            'The United States and Iran traded strikes; President Trump commented.'
        )
        if n is None:
            self.skipTest('NER model not installed')
        self.assertGreater(n, 0)

    def test_generic_text_has_no_entities(self):
        from .verification import count_named_entities
        n = count_named_entities(
            'The regional transport authority announced an expansion of weekend '
            'bus service across three districts starting next month.'
        )
        if n is None:
            self.skipTest('NER model not installed')
        self.assertEqual(n, 0)
