from django.contrib.auth import get_user_model
from django.test import TestCase

from analysis.models import Article, AnalysisResult

from .models import NewsPost
from .serializers import NewsPostSubmitSerializer


def make_post(user, classification, consistency, credibility=90.0):
    article = Article.objects.create(
        user=user, input_type=Article.InputType.TEXT,
        title='t', content='c' * 60,
    )
    result = AnalysisResult.objects.create(
        article=article,
        status=AnalysisResult.Status.COMPLETED,
        classification=classification,
        credibility_score=credibility,
        headline_body_consistency=consistency,
    )
    return NewsPost.objects.create(
        user=user, title='t', content='c' * 60, analysis_result=result,
    )


class SyncFromResultTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username='tester', email='tester@example.com', password='x',
        )

    def test_real_with_matching_headline_is_approved(self):
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

    def test_fake_is_rejected_regardless_of_consistency(self):
        post = make_post(self.user, 'FAKE', consistency=0.9, credibility=10.0)
        post.sync_from_result()
        self.assertEqual(post.status, NewsPost.Status.REJECTED)

    def test_resync_unpublishes_previously_approved_post(self):
        # Simulates a post approved before the consistency gate existed.
        post = make_post(self.user, 'REAL', consistency=0.0)
        NewsPost.objects.filter(id=post.id).update(status=NewsPost.Status.APPROVED)
        post.refresh_from_db()
        post.sync_from_result()
        self.assertEqual(post.status, NewsPost.Status.REJECTED)


class SubmitSerializerTitleTests(TestCase):
    def _errors(self, title):
        s = NewsPostSubmitSerializer(data={'title': title, 'content': 'c' * 60})
        s.is_valid()
        return s.errors.get('title', [])

    def test_normal_headline_passes(self):
        self.assertEqual(self._errors('Regional transport authority expands bus service'), [])

    def test_paragraph_length_title_is_rejected(self):
        self.assertTrue(any('too long' in str(e) for e in self._errors('Lorem ipsum ' * 40)))

    def test_too_short_title_is_rejected(self):
        self.assertTrue(any('too short' in str(e) for e in self._errors('News')))
