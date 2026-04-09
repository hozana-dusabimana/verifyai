from celery import shared_task
from django.conf import settings
from django.utils import timezone


PIPELINE_STAGES = [
    (1, 'Input Validation'),
    (2, 'Content Fetching'),
    (3, 'Preprocessing'),
    (4, 'Feature Extraction'),
    (5, 'Model Inference'),
    (6, 'Score Generation'),
    (7, 'Persistence & Notify'),
]


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def run_analysis_pipeline(self, result_id):
    """
    Run the 7-stage ML analysis pipeline using trained NLP models.

    Models: Naive Bayes (20%), LSTM (35%), DistilBERT (45%) ensemble.
    """
    from analysis.models import AnalysisResult

    try:
        result = AnalysisResult.objects.select_related('article').get(id=result_id)
    except AnalysisResult.DoesNotExist:
        return {'error': 'Result not found'}

    result.status = AnalysisResult.Status.PROCESSING
    result.save(update_fields=['status'])

    content = result.article.content
    title = result.article.title or ''

    try:
        # Stage 1: Input Validation
        _update_stage(result, 1, 'Input Validation')
        if result.article.input_type == 'text' and len(content or '') < 50:
            raise ValueError('Content too short. Minimum 50 characters required.')
        if len(content or '') > 50000:
            raise ValueError('Content too long. Maximum 50,000 characters allowed.')

        # Stage 2: Content Fetching
        _update_stage(result, 2, 'Content Fetching')
        if result.article.input_type == 'url' and result.article.original_url:
            content = _fetch_url_content(result.article.original_url)
            if content:
                result.article.content = content
                if not title:
                    title = _extract_title_from_url(result.article.original_url)
                    result.article.title = title
                result.article.save(update_fields=['content', 'title'])
            else:
                raise ValueError('Failed to fetch content from URL.')

        elif result.article.input_type == 'file' and result.article.uploaded_file:
            content = _extract_file_content(result.article.uploaded_file.path)
            result.article.content = content
            result.article.save(update_fields=['content'])

        if not content or len(content.strip()) < 20:
            raise ValueError('Insufficient content for analysis.')

        # Stage 3–6: ML Inference via the ML engine
        _update_stage(result, 3, 'Preprocessing')

        from ml_engine.inference import predict_ensemble, get_model_info

        # Check models are available
        model_info = get_model_info()
        if not model_info['all_ready']:
            raise RuntimeError(
                'ML models not trained yet. An admin must train models before analysis can run. '
                'Missing: ' + ', '.join(
                    k for k, v in model_info['models_available'].items() if not v
                )
            )

        _update_stage(result, 4, 'Feature Extraction')
        _update_stage(result, 5, 'Model Inference')

        # Run ensemble prediction (includes preprocessing, features, and all 3 models)
        prediction = predict_ensemble(content, title)

        _update_stage(result, 6, 'Score Generation')

        # Stage 7: Persistence & Notify
        _update_stage(result, 7, 'Persistence & Notify')

        result.naive_bayes_score = prediction['naive_bayes_score']
        result.lstm_score = prediction['lstm_score']
        result.distilbert_score = prediction['distilbert_score']
        result.ensemble_score = prediction['ensemble_score']
        result.credibility_score = prediction['credibility_score']
        result.classification = prediction['classification']
        result.confidence = prediction['confidence']
        result.sentiment_score = prediction['sentiment_score']
        result.emotional_tone = prediction['emotional_tone']
        result.sensationalism_score = prediction['sensationalism_score']
        result.headline_body_consistency = prediction['headline_body_consistency']
        result.top_keywords = prediction['top_keywords']
        result.flagging_reasons = prediction['flagging_reasons']
        result.status = AnalysisResult.Status.COMPLETED
        result.completed_at = timezone.now()
        result.save()

        # Auto-create alert if below threshold
        if prediction['credibility_score'] <= settings.ALERT_CREDIBILITY_THRESHOLD:
            from alerts.models import Alert
            Alert.objects.create(
                analysis_result=result,
                user=result.article.user,
                severity='high' if prediction['credibility_score'] <= 15 else 'medium',
                message=f'High-risk content detected. Credibility score: {prediction["credibility_score"]}%',
            )

        return {'result_id': str(result.id), 'status': 'completed'}

    except Exception as exc:
        result.status = AnalysisResult.Status.FAILED
        result.error_message = str(exc)
        result.save(update_fields=['status', 'error_message'])

        if not isinstance(exc, (ValueError, RuntimeError)):
            raise self.retry(exc=exc)

        return {'result_id': str(result.id), 'status': 'failed', 'error': str(exc)}


def _update_stage(result, stage_number, stage_name):
    """Update the current pipeline stage on the result."""
    result.current_stage = stage_number
    result.current_stage_name = stage_name
    result.save(update_fields=['current_stage', 'current_stage_name'])


def _fetch_url_content(url):
    """Fetch article content from a URL using newspaper3k."""
    try:
        from newspaper import Article as NewsArticle

        article = NewsArticle(url)
        article.download()
        article.parse()
        return article.text
    except Exception:
        # Fallback: try requests + BeautifulSoup
        try:
            import requests
            from bs4 import BeautifulSoup

            resp = requests.get(url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; VerifyAI/1.0)'
            })
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')

            # Remove script/style
            for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
                tag.decompose()

            paragraphs = soup.find_all('p')
            text = ' '.join(p.get_text().strip() for p in paragraphs)
            return text if len(text) > 50 else None
        except Exception:
            return None


def _extract_title_from_url(url):
    """Try to extract the page title from a URL."""
    try:
        from newspaper import Article as NewsArticle
        article = NewsArticle(url)
        article.download()
        article.parse()
        return article.title or ''
    except Exception:
        return ''


def _extract_file_content(file_path):
    """Extract text from uploaded file."""
    if file_path.endswith('.pdf'):
        import PyPDF2
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            return ' '.join(page.extract_text() or '' for page in reader.pages)
    else:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
