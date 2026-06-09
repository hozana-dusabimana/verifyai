from django.contrib import admin

from .models import NewsPost


@admin.register(NewsPost)
class NewsPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'status', 'classification', 'credibility_score', 'published_at', 'created_at')
    list_filter = ('status', 'classification')
    search_fields = ('title', 'source_name', 'author')
    readonly_fields = ('id', 'created_at', 'published_at')
