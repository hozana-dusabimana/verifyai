import random

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
    Run the 7-stage ML analysis pipeline.

    NOTE: This is a simulation/placeholder. In production, each stage would
    call the actual ML engine service. Replace the mock logic with real
    NLP preprocessing, feature extraction, and model inference.
    """
    from analysis.models import AnalysisResult

    try:
        result = AnalysisResult.objects.select_related('article').get(id=result_id)
    except AnalysisResult.DoesNotExist:
        return {'error': 'Result not found'}

    result.status = AnalysisResult.Status.PROCESSING
    result.save(update_fields=['status'])

    content = result.article.content

    try:
        # Stage 1: Input Validation
        _update_stage(result, 1, 'Input Validation')
        if len(content) < 50:
            raise ValueError('Content too short. Minimum 50 characters required.')
        if len(content) > 50000:
            raise ValueError('Content too long. Maximum 50,000 characters allowed.')

        # Stage 2: Content Fetching (if URL)
        _update_stage(result, 2, 'Content Fetching')
        if result.article.input_type == 'url' and result.article.original_url:
            # In production: use Newspaper3k to fetch and extract article
            # For now, we use the content as-is if provided
            pass

        # Stage 3: Preprocessing
        _update_stage(result, 3, 'Preprocessing')
        # In production: spaCy tokenization, lemmatization, stop-word removal
        clean_tokens = content.lower().split()

        # Stage 4: Feature Extraction
        _update_stage(result, 4, 'Feature Extraction')
        # In production: TF-IDF, VADER sentiment, GloVe embeddings, etc.
        # Mock feature values
        sentiment_score = random.uniform(-1.0, 1.0)
        sensationalism_score = random.uniform(0.0, 1.0)
        headline_body_consistency = random.uniform(0.0, 1.0)

        # Stage 5: Model Inference
        _update_stage(result, 5, 'Model Inference')
        # In production: run Naive Bayes, LSTM, DistilBERT in parallel
        # Mock scores (probability of being fake)
        nb_score = random.uniform(0.0, 1.0)
        lstm_score = random.uniform(0.0, 1.0)
        bert_score = random.uniform(0.0, 1.0)

        # Weighted ensemble: NB 20%, LSTM 35%, DistilBERT 45%
        ensemble_fake_prob = (nb_score * 0.20) + (lstm_score * 0.35) + (bert_score * 0.45)

        # Stage 6: Score Generation
        _update_stage(result, 6, 'Score Generation')
        credibility_score = round((1 - ensemble_fake_prob) * 100, 2)

        if credibility_score <= 30:
            classification = 'FAKE'
        elif credibility_score <= 60:
            classification = 'UNCERTAIN'
        else:
            classification = 'REAL'

        confidence = round(abs(credibility_score - 50) * 2, 2)
        confidence = min(confidence, 100.0)

        # Determine emotional tone
        if sentiment_score > 0.3:
            emotional_tone = 'Positive'
        elif sentiment_score < -0.3:
            emotional_tone = 'Negative'
        else:
            emotional_tone = 'Neutral'

        # Mock top keywords and flagging reasons
        words = list(set(clean_tokens[:100]))
        top_keywords = words[:10] if len(words) >= 10 else words

        flagging_reasons = []
        if sensationalism_score > 0.7:
            flagging_reasons.append('High sensationalism detected in language.')
        if headline_body_consistency < 0.4:
            flagging_reasons.append('Headline does not match article body content.')
        if sentiment_score < -0.5:
            flagging_reasons.append('Strongly negative emotional tone detected.')
        if ensemble_fake_prob > 0.7:
            flagging_reasons.append('Multiple ML models flagged content as likely fake.')
        if not flagging_reasons:
            flagging_reasons.append('No major concerns detected.')

        # Stage 7: Persistence & Notify
        _update_stage(result, 7, 'Persistence & Notify')

        result.naive_bayes_score = round(nb_score, 4)
        result.lstm_score = round(lstm_score, 4)
        result.distilbert_score = round(bert_score, 4)
        result.ensemble_score = round(ensemble_fake_prob, 4)
        result.credibility_score = credibility_score
        result.classification = classification
        result.confidence = confidence
        result.sentiment_score = round(sentiment_score, 4)
        result.emotional_tone = emotional_tone
        result.sensationalism_score = round(sensationalism_score, 4)
        result.headline_body_consistency = round(headline_body_consistency, 4)
        result.top_keywords = top_keywords
        result.flagging_reasons = flagging_reasons
        result.status = AnalysisResult.Status.COMPLETED
        result.completed_at = timezone.now()
        result.save()

        # Auto-create alert if below threshold
        if credibility_score <= settings.ALERT_CREDIBILITY_THRESHOLD:
            from alerts.models import Alert
            Alert.objects.create(
                analysis_result=result,
                user=result.article.user,
                severity='high' if credibility_score <= 15 else 'medium',
                message=f'High-risk content detected. Credibility score: {credibility_score}%',
            )

        return {'result_id': str(result.id), 'status': 'completed'}

    except Exception as exc:
        result.status = AnalysisResult.Status.FAILED
        result.error_message = str(exc)
        result.save(update_fields=['status', 'error_message'])

        # Retry on transient errors
        if not isinstance(exc, ValueError):
            raise self.retry(exc=exc)

        return {'result_id': str(result.id), 'status': 'failed', 'error': str(exc)}


def _update_stage(result, stage_number, stage_name):
    """Update the current pipeline stage on the result."""
    result.current_stage = stage_number
    result.current_stage_name = stage_name
    result.save(update_fields=['current_stage', 'current_stage_name'])
