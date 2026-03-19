from django.contrib import admin

from .models import Article, AnalysisResult


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'input_type', 'title', 'source_name', 'created_at']
    list_filter = ['input_type', 'created_at']
    search_fields = ['title', 'source_name', 'content']


@admin.register(AnalysisResult)
class AnalysisResultAdmin(admin.ModelAdmin):
    list_display = ['id', 'article', 'status', 'classification', 'credibility_score', 'created_at']
    list_filter = ['status', 'classification']
    search_fields = ['article__title']
