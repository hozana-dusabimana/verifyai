from analysis.models import Article, AnalysisResult
from analysis.tasks import run_analysis_pipeline

from .models import NewsPost
from .verification import compute_source_match, count_named_entities


def create_and_verify_post(user, title, content, source_name='', author='', source_url=''):
    """Create a news post, run it through the ML analysis pipeline, and set its
    approval status from the verdict.

    With CELERY_TASK_ALWAYS_EAGER the pipeline runs synchronously, so the post
    returns already approved/rejected. With a real worker the post starts
    PENDING and is reconciled later via :meth:`NewsPost.sync_from_result`.
    """
    article = Article.objects.create(
        user=user,
        input_type=Article.InputType.TEXT,
        title=title,
        content=content,
        source_name=source_name,
        author=author,
    )
    result = AnalysisResult.objects.create(
        article=article,
        status=AnalysisResult.Status.PENDING,
    )

    task = run_analysis_pipeline.delay(str(result.id))
    result.celery_task_id = task.id
    result.save(update_fields=['celery_task_id'])

    # Re-load to capture work done synchronously in eager mode.
    result.refresh_from_db()

    post = NewsPost.objects.create(
        user=user,
        title=title,
        content=content,
        source_name=source_name,
        author=author,
        source_url=source_url,
        source_match_score=compute_source_match(content, source_url),
        named_entity_count=count_named_entities(f'{title}. {content}'),
        analysis_result=result,
    )

    if result.status in (AnalysisResult.Status.COMPLETED, AnalysisResult.Status.FAILED):
        post.sync_from_result()
    return post
