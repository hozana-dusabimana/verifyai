from django.urls import path

from . import views

urlpatterns = [
    # Auth
    path('auth/register', views.RegisterView.as_view(), name='register'),
    path('auth/login', views.LoginView.as_view(), name='login'),
    path('auth/logout', views.LogoutView.as_view(), name='logout'),
    path('auth/refresh', views.RefreshTokenView.as_view(), name='token-refresh'),
    path('auth/verify-email/<str:token>', views.VerifyEmailView.as_view(), name='verify-email'),
    path('auth/forgot-password', views.ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password', views.ResetPasswordView.as_view(), name='reset-password'),
    path('auth/oauth/google', views.GoogleOAuthView.as_view(), name='google-oauth'),
    path('auth/oauth/google/callback', views.GoogleOAuthCallbackView.as_view(), name='google-oauth-callback'),

    # User profile
    path('users/me', views.UserProfileView.as_view(), name='user-profile'),
    path('users/me/password', views.ChangePasswordView.as_view(), name='change-password'),
    path('users/me/apikeys', views.APIKeyListView.as_view(), name='apikey-list'),
    path('users/me/apikeys/create', views.APIKeyCreateView.as_view(), name='apikey-create'),
    path('users/me/apikeys/<uuid:key_id>', views.APIKeyDeleteView.as_view(), name='apikey-delete'),

    # Admin user management
    path('users', views.AdminUserListView.as_view(), name='admin-user-list'),
    path('users/<uuid:user_id>/role', views.AdminUserRoleUpdateView.as_view(), name='admin-user-role'),
    path('users/<uuid:user_id>', views.AdminUserDeactivateView.as_view(), name='admin-user-deactivate'),
]
