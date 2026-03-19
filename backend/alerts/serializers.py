from rest_framework import serializers

from .models import Alert, NotificationPreference


class AlertSerializer(serializers.ModelSerializer):
    article_title = serializers.CharField(source='analysis_result.article.title', read_only=True)
    credibility_score = serializers.FloatField(source='analysis_result.credibility_score', read_only=True)

    class Meta:
        model = Alert
        fields = [
            'id', 'analysis_result_id', 'article_title', 'credibility_score',
            'severity', 'status', 'message', 'assigned_to',
            'created_at', 'updated_at', 'resolved_at',
        ]
        read_only_fields = ['id', 'analysis_result_id', 'created_at', 'updated_at']


class AlertDetailSerializer(serializers.ModelSerializer):
    article_title = serializers.CharField(source='analysis_result.article.title', read_only=True)
    credibility_score = serializers.FloatField(source='analysis_result.credibility_score', read_only=True)
    classification = serializers.CharField(source='analysis_result.classification', read_only=True)
    article_snippet = serializers.SerializerMethodField()

    class Meta:
        model = Alert
        fields = [
            'id', 'analysis_result_id', 'article_title', 'article_snippet',
            'credibility_score', 'classification', 'severity', 'status',
            'message', 'assigned_to', 'created_at', 'updated_at', 'resolved_at',
        ]

    def get_article_snippet(self, obj):
        content = obj.analysis_result.article.content
        return content[:300] + '...' if len(content) > 300 else content


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['email_on_high_risk', 'email_on_analysis_complete', 'alert_threshold', 'email_frequency']
