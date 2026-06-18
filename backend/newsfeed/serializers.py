from rest_framework import serializers

from .models import NewsPost


class NewsPostSubmitSerializer(serializers.Serializer):
    """Validates a new community news submission."""
    title = serializers.CharField(max_length=500)
    content = serializers.CharField()
    # Optional: a sourced story can publish automatically; a sourceless one is
    # held for editorial review instead.
    source_url = serializers.URLField(
        required=False, allow_blank=True, max_length=500,
        error_messages={
            'invalid': 'Enter a valid source URL (starting with http:// or https://).',
        },
    )
    source_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    author = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError(
                'Headline too short. Use a descriptive headline of at least 10 characters.'
            )
        if len(value) > 200:
            raise serializers.ValidationError(
                'Headline too long. Use a concise headline of at most 200 characters '
                '— details belong in the story content.'
            )
        return value

    def validate_content(self, value):
        if len(value.strip()) < 50:
            raise serializers.ValidationError(
                'Content too short. Minimum 50 characters required for verification.'
            )
        if len(value) > 50000:
            raise serializers.ValidationError(
                'Content too long. Maximum 50,000 characters allowed.'
            )
        # English and Kinyarwanda are supported (routed to their models at
        # verification time). Reject other languages so a story isn't published
        # on a meaningless verdict.
        from ml_engine.language import detect_language
        if detect_language(value) == 'other':
            raise serializers.ValidationError(
                'Analysis currently supports English and Kinyarwanda content only.'
            )
        return value


class NewsPostSerializer(serializers.ModelSerializer):
    """Full post view — returned to the author (includes verdict + errors)."""
    submitted_by = serializers.SerializerMethodField()
    confidence = serializers.FloatField(source='analysis_result.confidence', read_only=True, default=None)

    class Meta:
        model = NewsPost
        fields = [
            'id', 'title', 'content', 'source_name', 'source_url', 'author',
            'status', 'classification', 'credibility_score', 'confidence',
            'source_match_score', 'named_entity_count',
            'error_message', 'submitted_by', 'created_at', 'published_at',
        ]

    def get_submitted_by(self, obj):
        u = obj.user
        if not u:
            return None
        return u.full_name or u.email


class NewsFeedSerializer(serializers.ModelSerializer):
    """Public newsletter view of an approved post."""
    submitted_by = serializers.SerializerMethodField()
    excerpt = serializers.SerializerMethodField()

    class Meta:
        model = NewsPost
        fields = [
            'id', 'title', 'excerpt', 'content', 'source_name', 'source_url', 'author',
            'classification', 'credibility_score', 'submitted_by', 'published_at',
        ]

    def get_submitted_by(self, obj):
        u = obj.user
        if not u:
            return None
        return u.full_name or u.email

    def get_excerpt(self, obj):
        text = (obj.content or '').strip()
        return text[:280] + ('…' if len(text) > 280 else '')
