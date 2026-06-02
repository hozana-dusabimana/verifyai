from rest_framework import serializers


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
