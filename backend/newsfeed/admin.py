from django.contrib import admin

from .models import NewsPost


@admin.register(NewsPost)
class NewsPostAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'user', 'status', 'classification', 'credibility_score',
        'source_url', 'named_entity_count', 'reviewed_by', 'published_at', 'created_at',
    )
    list_filter = ('status', 'classification')
    search_fields = ('title', 'source_name', 'author')
    readonly_fields = ('id', 'created_at', 'published_at', 'reviewed_by', 'reviewed_at')
    actions = ('approve_posts', 'reject_posts')

    @admin.action(description='Approve selected posts (publish to the wire)')
    def approve_posts(self, request, queryset):
        for post in queryset:
            post.review(request.user, approve=True)
        self.message_user(request, f'{queryset.count()} post(s) approved and published.')

    @admin.action(description='Reject selected posts')
    def reject_posts(self, request, queryset):
        for post in queryset:
            post.review(request.user, approve=False)
        self.message_user(request, f'{queryset.count()} post(s) rejected.')
