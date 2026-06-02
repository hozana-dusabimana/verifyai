from rest_framework import serializers

from .models import AuditLog, Dataset, AlertRule, TrainingJob


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'action', 'resource_type',
            'resource_id', 'ip_address', 'user_agent', 'metadata', 'created_at',
        ]


class DatasetSerializer(serializers.ModelSerializer):
    uploaded_by_email = serializers.EmailField(source='uploaded_by.email', read_only=True, default=None)

    class Meta:
        model = Dataset
        fields = [
            'id', 'name', 'description', 'file', 'uploaded_by',
            'uploaded_by_email', 'record_count', 'created_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at']


class DatasetUploadSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    file = serializers.FileField()


class TrainingJobSerializer(serializers.ModelSerializer):
    started_by_email = serializers.EmailField(source='started_by.email', read_only=True, default=None)
    dataset_name = serializers.CharField(source='dataset.name', read_only=True, default=None)

    class Meta:
        model = TrainingJob
        fields = [
            'id', 'status', 'progress', 'stage', 'message', 'metrics', 'error',
            'dataset', 'dataset_name', 'started_by', 'started_by_email',
            'created_at', 'started_at', 'finished_at',
        ]


class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = ['id', 'name', 'credibility_threshold', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
