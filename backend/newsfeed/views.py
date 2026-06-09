from django.shortcuts import render
from django.views.decorators.clickjacking import xframe_options_exempt
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


@xframe_options_exempt
def portal_page(request):
    """Serves 'The Civic Wire' — a standalone external-app demo that consumes
    the VerifyAI API over HTTP (same-origin to avoid CORS). Not part of the
    React dashboard."""
    return render(request, 'newsfeed/portal.html')

from .models import NewsPost
from .serializers import (
    NewsPostSubmitSerializer,
    NewsPostSerializer,
    NewsFeedSerializer,
)
from .services import create_and_verify_post


def _success(data=None, status_code=status.HTTP_200_OK, meta=None):
    body = {'success': True, 'data': data, 'error': None}
    if meta:
        body['meta'] = meta
    return Response(body, status=status_code)


def _error(message, status_code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'data': None, 'error': message}, status=status_code)


class NewsPostSubmitView(APIView):
    """Submit a news post for AI verification. Approved (REAL) posts publish to
    the public feed automatically."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = NewsPostSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors)

        data = serializer.validated_data
        post = create_and_verify_post(
            user=request.user,
            title=data['title'],
            content=data['content'],
            source_name=data.get('source_name', ''),
            author=data.get('author', ''),
        )
        return _success(NewsPostSerializer(post).data, status_code=status.HTTP_201_CREATED)


class NewsFeedView(APIView):
    """Public newsletter — paginated list of approved news posts."""
    permission_classes = [AllowAny]

    def get(self, request):
        posts = (
            NewsPost.objects
            .filter(status=NewsPost.Status.APPROVED)
            .select_related('user')
        )

        search = request.query_params.get('search')
        if search:
            posts = posts.filter(title__icontains=search)

        paginator = PageNumberPagination()
        paginator.page_size = 12
        page = paginator.paginate_queryset(posts, request)
        serializer = NewsFeedSerializer(page, many=True)
        return _success(serializer.data, meta={
            'count': paginator.page.paginator.count,
            'next': paginator.get_next_link(),
            'previous': paginator.get_previous_link(),
        })


class MyNewsPostsView(APIView):
    """The authenticated user's own posts, including rejected/failed ones."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        posts = NewsPost.objects.filter(user=request.user).select_related('user', 'analysis_result')
        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(posts, request)
        serializer = NewsPostSerializer(page, many=True)
        return _success(serializer.data, meta={
            'count': paginator.page.paginator.count,
            'next': paginator.get_next_link(),
            'previous': paginator.get_previous_link(),
        })


class NewsPostDetailView(APIView):
    """Approved posts are public; non-approved posts are visible only to their
    author. Authors may delete their own posts."""
    permission_classes = [AllowAny]

    def get(self, request, post_id):
        try:
            post = NewsPost.objects.select_related('user', 'analysis_result').get(id=post_id)
        except NewsPost.DoesNotExist:
            return _error('Post not found.', status.HTTP_404_NOT_FOUND)

        is_owner = request.user.is_authenticated and post.user_id == request.user.id
        if post.status != NewsPost.Status.APPROVED and not is_owner:
            return _error('Post not found.', status.HTTP_404_NOT_FOUND)

        if is_owner:
            return _success(NewsPostSerializer(post).data)
        return _success(NewsFeedSerializer(post).data)

    def delete(self, request, post_id):
        if not request.user.is_authenticated:
            return _error('Authentication required.', status.HTTP_401_UNAUTHORIZED)
        try:
            post = NewsPost.objects.get(id=post_id, user=request.user)
        except NewsPost.DoesNotExist:
            return _error('Post not found.', status.HTTP_404_NOT_FOUND)
        post.delete()
        return _success({'detail': 'Post deleted.'})
