from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from accounts.permissions import HasRolePermission
from .models import Article, AnalysisResult
from .serializers import (
    ArticleSubmitSerializer,
    BulkArticleSubmitSerializer,
    AnalysisResultSerializer,
    AnalysisStatusSerializer,
    AnalysisExplainSerializer,
    AnalysisHistorySerializer,
)


def _success(data=None, status_code=status.HTTP_200_OK, meta=None):
    body = {'success': True, 'data': data, 'error': None}
    if meta:
        body['meta'] = meta
    return __import__('rest_framework.response', fromlist=['Response']).Response(body, status=status_code)


def _error(message, status_code=status.HTTP_400_BAD_REQUEST):
    from rest_framework.response import Response
    return Response({'success': False, 'data': None, 'error': message}, status=status_code)


class AnalysisSubmitView(APIView):
    """Submit text, URL, or file for AI analysis."""

    def post(self, request):
        serializer = ArticleSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors)

        data = serializer.validated_data

        # Language guardrail: English routes to the ensemble and Kinyarwanda to
        # its dedicated model (handled in the task). Other languages would yield
        # a meaningless verdict, so reject them upfront for direct text input.
        # (URL/file content is only known later, so the task re-checks there.)
        if data['input_type'] == 'text':
            from ml_engine.language import detect_language
            if detect_language(data.get('content', '')) == 'other':
                return _error(
                    'Analysis currently supports English and Kinyarwanda content only.'
                )

        article = Article.objects.create(
            user=request.user,
            input_type=data['input_type'],
            content=data.get('content', ''),
            original_url=data.get('url', ''),
            source_name=data.get('source_name', ''),
            author=data.get('author', ''),
            publication_date=data.get('publication_date'),
            uploaded_file=data.get('file'),
        )

        result = AnalysisResult.objects.create(
            article=article,
            status=AnalysisResult.Status.PENDING,
        )

        # Trigger ML pipeline. With CELERY_TASK_ALWAYS_EAGER the task runs
        # synchronously here, so by the time .delay() returns the result row is
        # already populated; with a real worker it stays PENDING for polling.
        from .tasks import run_analysis_pipeline
        task = run_analysis_pipeline.delay(str(result.id))
        result.celery_task_id = task.id
        result.save(update_fields=['celery_task_id'])

        # Re-load so the response reflects any work completed synchronously
        # (eager mode) instead of the stale PENDING snapshot.
        result = AnalysisResult.objects.select_related('article').get(id=result.id)

        return _success(
            AnalysisResultSerializer(result).data,
            status_code=status.HTTP_201_CREATED,
        )


class AnalysisDetailView(APIView):
    """Get full analysis result by ID."""

    def get(self, request, analysis_id):
        try:
            result = AnalysisResult.objects.select_related('article').get(
                id=analysis_id, article__user=request.user,
            )
        except AnalysisResult.DoesNotExist:
            return _error('Analysis not found.', status.HTTP_404_NOT_FOUND)
        return _success(AnalysisResultSerializer(result).data)

    def delete(self, request, analysis_id):
        try:
            result = AnalysisResult.objects.get(id=analysis_id, article__user=request.user)
        except AnalysisResult.DoesNotExist:
            return _error('Analysis not found.', status.HTTP_404_NOT_FOUND)
        article = result.article
        result.delete()
        article.delete()
        return _success({'detail': 'Analysis deleted.'})


class AnalysisStatusView(APIView):
    """Poll async job status."""

    def get(self, request, analysis_id):
        try:
            result = AnalysisResult.objects.get(id=analysis_id, article__user=request.user)
        except AnalysisResult.DoesNotExist:
            return _error('Analysis not found.', status.HTTP_404_NOT_FOUND)
        return _success(AnalysisStatusSerializer(result).data)


class AnalysisExplainView(APIView):
    """Get explainability data."""

    def get(self, request, analysis_id):
        try:
            result = AnalysisResult.objects.get(id=analysis_id, article__user=request.user)
        except AnalysisResult.DoesNotExist:
            return _error('Analysis not found.', status.HTTP_404_NOT_FOUND)
        return _success(AnalysisExplainSerializer(result).data)


class AnalysisFlagView(APIView):
    """Flag result for manual review."""

    def post(self, request, analysis_id):
        try:
            result = AnalysisResult.objects.get(id=analysis_id, article__user=request.user)
        except AnalysisResult.DoesNotExist:
            return _error('Analysis not found.', status.HTTP_404_NOT_FOUND)
        result.is_flagged_for_review = True
        result.flagged_by = request.user
        result.save(update_fields=['is_flagged_for_review', 'flagged_by'])
        return _success({'detail': 'Flagged for review.'})


class AnalysisHistoryView(APIView):
    """Paginated list of user's past analyses."""

    def get(self, request):
        from rest_framework.pagination import PageNumberPagination

        results = AnalysisResult.objects.select_related('article', 'article__user')

        # Scope: own analyses (default) or whole organization (government/admin).
        scope = request.query_params.get('scope', 'own')
        can_view_org = (
            request.user.has_role_permission('view_org_analyses')
            and bool(request.user.organization)
        )
        if scope == 'org' and can_view_org:
            from accounts.models import User
            org_users = User.objects.filter(organization__iexact=request.user.organization)
            results = results.filter(article__user__in=org_users)
            member = request.query_params.get('member')
            if member:
                results = results.filter(article__user_id=member)
        else:
            results = results.filter(article__user=request.user)

        # Filters
        classification = request.query_params.get('classification')
        if classification:
            results = results.filter(classification=classification)

        score_min = request.query_params.get('score_min')
        score_max = request.query_params.get('score_max')
        if score_min:
            results = results.filter(credibility_score__gte=float(score_min))
        if score_max:
            results = results.filter(credibility_score__lte=float(score_max))

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            results = results.filter(created_at__date__gte=date_from)
        if date_to:
            results = results.filter(created_at__date__lte=date_to)

        source = request.query_params.get('source')
        if source:
            results = results.filter(article__source_name__icontains=source)

        search = request.query_params.get('search')
        if search:
            results = results.filter(article__title__icontains=search)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(results, request)
        serializer = AnalysisHistorySerializer(page, many=True)
        return _success(serializer.data, meta={
            'count': paginator.page.paginator.count,
            'next': paginator.get_next_link(),
            'previous': paginator.get_previous_link(),
        })


class BulkAnalysisSubmitView(APIView):
    """Submit up to 50 articles in a single request."""
    required_permission = 'bulk_submission'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def post(self, request):
        serializer = BulkArticleSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors)

        from .tasks import run_analysis_pipeline

        results_data = []
        for article_data in serializer.validated_data['articles']:
            article = Article.objects.create(
                user=request.user,
                input_type=article_data['input_type'],
                content=article_data.get('content', ''),
                original_url=article_data.get('url', ''),
                source_name=article_data.get('source_name', ''),
                author=article_data.get('author', ''),
                publication_date=article_data.get('publication_date'),
            )
            result = AnalysisResult.objects.create(
                article=article,
                status=AnalysisResult.Status.PENDING,
            )
            task = run_analysis_pipeline.delay(str(result.id))
            result.celery_task_id = task.id
            result.save(update_fields=['celery_task_id'])
            # Re-load so the response reflects work completed synchronously
            # (eager mode) instead of the stale PENDING snapshot — mirrors the
            # single-submit view. With a real worker it stays PENDING for polling.
            result = AnalysisResult.objects.select_related('article').get(id=result.id)
            results_data.append({
                'id': str(result.id),
                'status': result.status,
                'classification': result.classification,
                'credibility_score': result.credibility_score,
            })

        return _success(results_data, status_code=status.HTTP_201_CREATED)


class AnalysisExportPDFView(APIView):
    """Download analysis as PDF."""

    def get(self, request, analysis_id):
        try:
            result = AnalysisResult.objects.select_related('article').get(
                id=analysis_id, article__user=request.user,
            )
        except AnalysisResult.DoesNotExist:
            return _error('Analysis not found.', status.HTTP_404_NOT_FOUND)

        from django.http import HttpResponse
        import json

        # Simple text-based export (PDF generation would require reportlab)
        content = (
            f"VerifyAI Analysis Report\n"
            f"========================\n\n"
            f"Article: {result.article.title}\n"
            f"Source: {result.article.source_name}\n"
            f"Submitted: {result.created_at}\n\n"
            f"Classification: {result.classification}\n"
            f"Credibility Score: {result.credibility_score}%\n"
            f"Confidence: {result.confidence}%\n\n"
            f"Sentiment: {result.sentiment_score}\n"
            f"Sensationalism: {result.sensationalism_score}\n"
            f"Headline-Body Consistency: {result.headline_body_consistency}\n\n"
            f"Top Keywords: {', '.join(result.top_keywords)}\n\n"
            f"Flagging Reasons:\n"
        )
        for reason in result.flagging_reasons:
            content += f"  - {reason}\n"

        response = HttpResponse(content, content_type='text/plain')
        response['Content-Disposition'] = f'attachment; filename="analysis_{analysis_id}.txt"'
        return response


class AnalysisExportCSVView(APIView):
    """Download analysis as CSV."""

    def get(self, request, analysis_id):
        try:
            result = AnalysisResult.objects.select_related('article').get(
                id=analysis_id, article__user=request.user,
            )
        except AnalysisResult.DoesNotExist:
            return _error('Analysis not found.', status.HTTP_404_NOT_FOUND)

        import csv
        from django.http import HttpResponse

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="analysis_{analysis_id}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Title', 'Source', 'Classification', 'Credibility Score',
            'Confidence', 'Sentiment', 'Sensationalism', 'Created At',
        ])
        writer.writerow([
            str(result.id), result.article.title, result.article.source_name,
            result.classification, result.credibility_score, result.confidence,
            result.sentiment_score, result.sensationalism_score, result.created_at,
        ])
        return response
