from rest_framework import serializers

from .models import Article, AnalysisResult


class ArticleSubmitSerializer(serializers.Serializer):
    """Handles text, URL, or file submission."""
    input_type = serializers.ChoiceField(choices=Article.InputType.choices)
    content = serializers.CharField(required=False, allow_blank=True)
    url = serializers.URLField(required=False, allow_blank=True)
    file = serializers.FileField(required=False)
    source_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    author = serializers.CharField(required=False, allow_blank=True, max_length=255)
    publication_date = serializers.DateField(required=False)

    def validate(self, attrs):
        input_type = attrs.get('input_type')
        if input_type == 'text' and not attrs.get('content'):
            raise serializers.ValidationError({'content': 'Content is required for text input.'})
        if input_type == 'url' and not attrs.get('url'):
            raise serializers.ValidationError({'url': 'URL is required for URL input.'})
        if input_type == 'file' and not attrs.get('file'):
            raise serializers.ValidationError({'file': 'File is required for file input.'})
        return attrs


class BulkArticleSubmitSerializer(serializers.Serializer):
    articles = ArticleSubmitSerializer(many=True)

    def validate_articles(self, value):
        if len(value) > 50:
            raise serializers.ValidationError('Maximum 50 articles per bulk submission.')
        return value


class ArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = [
            'id', 'input_type', 'original_url', 'title', 'author',
            'source_name', 'publication_date', 'content', 'created_at',
        ]


class AnalysisResultSerializer(serializers.ModelSerializer):
    article = ArticleSerializer(read_only=True)

    class Meta:
        model = AnalysisResult
        fields = [
            'id', 'article', 'status', 'current_stage', 'current_stage_name',
            'naive_bayes_score', 'lstm_score', 'distilbert_score', 'ensemble_score',
            'credibility_score', 'classification', 'confidence',
            'sentiment_score', 'emotional_tone', 'sensationalism_score',
            'headline_body_consistency', 'top_keywords', 'flagging_reasons',
            'is_flagged_for_review', 'celery_task_id', 'error_message',
            'created_at', 'completed_at',
        ]


class AnalysisStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisResult
        fields = ['id', 'status', 'current_stage', 'current_stage_name', 'error_message']


class AnalysisExplainSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisResult
        fields = [
            'id', 'top_keywords', 'flagging_reasons', 'feature_vector',
            'sentiment_score', 'emotional_tone', 'sensationalism_score',
            'headline_body_consistency',
        ]


class AnalysisHistorySerializer(serializers.ModelSerializer):
    """Lightweight serializer for history list view."""
    title = serializers.CharField(source='article.title')
    source_name = serializers.CharField(source='article.source_name')
    input_type = serializers.CharField(source='article.input_type')

    class Meta:
        model = AnalysisResult
        fields = [
            'id', 'title', 'source_name', 'input_type',
            'credibility_score', 'classification', 'confidence',
            'status', 'created_at', 'completed_at',
        ]
