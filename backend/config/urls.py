from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def health(_request):
    """Public, unauthenticated liveness probe (no DB hit). Used by deploy
    health-checks and uptime monitors."""
    return JsonResponse({'status': 'ok', 'service': 'verifyai-backend'})


urlpatterns = [
    path('health', health, name='health'),
    path('admin/', admin.site.urls),
    path('api/v1/', include('accounts.urls')),
    path('api/v1/', include('analysis.urls')),
    path('api/v1/', include('alerts.urls')),
    path('api/v1/', include('analytics.urls')),
    path('api/v1/', include('administration.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
