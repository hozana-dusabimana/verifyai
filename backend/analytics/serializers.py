from rest_framework import serializers

from .models import Report


class AnalyticsSummarySerializer(serializers.Serializer):
    total_analyzed = serializers.IntegerField()
    average_credibility = serializers.FloatField()
    fake_count = serializers.IntegerField()
    real_count = serializers.IntegerField()
    uncertain_count = serializers.IntegerField()
    active_alerts = serializers.IntegerField()


class TrendDataPointSerializer(serializers.Serializer):
    date = serializers.DateField()
    real_count = serializers.IntegerField()
    fake_count = serializers.IntegerField()
    uncertain_count = serializers.IntegerField()


class SourceCredibilitySerializer(serializers.Serializer):
    source_name = serializers.CharField()
    average_credibility = serializers.FloatField()
    article_count = serializers.IntegerField()


class KeywordSerializer(serializers.Serializer):
    keyword = serializers.CharField()
    count = serializers.IntegerField()
    context = serializers.CharField()


class TopicSerializer(serializers.Serializer):
    topic = serializers.CharField()
    count = serializers.IntegerField()


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['id', 'title', 'report_format', 'status', 'file', 'date_from', 'date_to', 'created_at']
        read_only_fields = ['id', 'status', 'file', 'created_at']


class ReportGenerateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    report_format = serializers.ChoiceField(choices=Report.Format.choices)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
