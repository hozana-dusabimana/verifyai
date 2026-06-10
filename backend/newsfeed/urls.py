from django.urls import path

from . import views

urlpatterns = [
    path('newsfeed/posts', views.NewsPostSubmitView.as_view(), name='newsfeed-submit'),
    path('newsfeed/posts/mine', views.MyNewsPostsView.as_view(), name='newsfeed-mine'),
    path('newsfeed/feed', views.NewsFeedView.as_view(), name='newsfeed-feed'),
    path('newsfeed/posts/<uuid:post_id>', views.NewsPostDetailView.as_view(), name='newsfeed-detail'),
    path('newsfeed/posts/<uuid:post_id>/unpublish', views.NewsPostUnpublishView.as_view(), name='newsfeed-unpublish'),
]
