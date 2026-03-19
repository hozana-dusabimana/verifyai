import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import APIKey
from .permissions import IsAdmin, HasRolePermission
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    AdminUserSerializer,
    UserRoleUpdateSerializer,
    APIKeySerializer,
    APIKeyCreateSerializer,
)

User = get_user_model()


def _success(data=None, status_code=status.HTTP_200_OK, meta=None):
    body = {'success': True, 'data': data, 'error': None}
    if meta:
        body['meta'] = meta
    return Response(body, status=status_code)


def _error(message, status_code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'data': None, 'error': message}, status=status_code)


# ─── Authentication ───────────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors)

        user = serializer.save()

        # Generate email verification token
        token = secrets.token_urlsafe(48)
        user.email_verification_token = token
        user.save(update_fields=['email_verification_token'])

        # Send verification email
        verify_url = f'{settings.FRONTEND_URL}/verify-email/{token}'
        send_mail(
            subject='VerifyAI — Confirm your email',
            message=f'Click the link to verify your email: {verify_url}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )

        return _success(
            {'id': str(user.id), 'email': user.email},
            status_code=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return _error('Invalid credentials.', status.HTTP_401_UNAUTHORIZED)

        # Check lockout
        if user.lockout_until and timezone.now() < user.lockout_until:
            return _error('Account is locked. Try again later.', status.HTTP_403_FORBIDDEN)

        if not user.check_password(password):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.lockout_until = timezone.now() + timezone.timedelta(minutes=30)
            user.save(update_fields=['failed_login_attempts', 'lockout_until'])
            return _error('Invalid credentials.', status.HTTP_401_UNAUTHORIZED)

        # Reset on success
        user.failed_login_attempts = 0
        user.lockout_until = None
        user.save(update_fields=['failed_login_attempts', 'lockout_until'])

        refresh = RefreshToken.for_user(user)
        return _success({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserProfileSerializer(user).data,
        })


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return _success({'detail': 'Logged out.'})


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return _error('Refresh token required.')
        try:
            token = RefreshToken(refresh_token)
            return _success({
                'access': str(token.access_token),
                'refresh': str(token),
            })
        except Exception:
            return _error('Invalid or expired refresh token.', status.HTTP_401_UNAUTHORIZED)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            user = User.objects.get(email_verification_token=token)
        except User.DoesNotExist:
            return _error('Invalid verification token.', status.HTTP_404_NOT_FOUND)

        user.is_email_verified = True
        user.email_verification_token = ''
        user.save(update_fields=['is_email_verified', 'email_verification_token'])
        return _success({'detail': 'Email verified successfully.'})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors)

        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            token = secrets.token_urlsafe(48)
            user.password_reset_token = token
            user.password_reset_token_created = timezone.now()
            user.save(update_fields=['password_reset_token', 'password_reset_token_created'])

            reset_url = f'{settings.FRONTEND_URL}/reset-password/{token}'
            send_mail(
                subject='VerifyAI — Reset your password',
                message=f'Click the link to reset your password: {reset_url}',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except User.DoesNotExist:
            pass  # Don't reveal whether email exists

        return _success({'detail': 'If that email exists, a reset link has been sent.'})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors)

        token = serializer.validated_data['token']
        try:
            user = User.objects.get(password_reset_token=token)
        except User.DoesNotExist:
            return _error('Invalid reset token.', status.HTTP_400_BAD_REQUEST)

        # Check token expiry (1 hour)
        if user.password_reset_token_created:
            elapsed = timezone.now() - user.password_reset_token_created
            if elapsed.total_seconds() > 3600:
                return _error('Reset token has expired.', status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.password_reset_token = ''
        user.password_reset_token_created = None
        user.save(update_fields=['password', 'password_reset_token', 'password_reset_token_created'])
        return _success({'detail': 'Password reset successfully.'})


class GoogleOAuthView(APIView):
    """Initiate Google OAuth2 flow — returns the redirect URL."""
    permission_classes = [AllowAny]

    def get(self, request):
        client_id = settings.GOOGLE_OAUTH2_CLIENT_ID
        redirect_uri = settings.GOOGLE_OAUTH2_REDIRECT_URI
        scope = 'openid email profile'
        url = (
            f'https://accounts.google.com/o/oauth2/v2/auth'
            f'?client_id={client_id}'
            f'&redirect_uri={redirect_uri}'
            f'&response_type=code'
            f'&scope={scope}'
            f'&access_type=offline'
        )
        return _success({'redirect_url': url})


class GoogleOAuthCallbackView(APIView):
    """Handle Google OAuth2 callback — exchange code for tokens."""
    permission_classes = [AllowAny]

    def get(self, request):
        import requests as http_requests

        code = request.query_params.get('code')
        if not code:
            return _error('Authorization code required.')

        # Exchange code for tokens
        token_response = http_requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'code': code,
                'client_id': settings.GOOGLE_OAUTH2_CLIENT_ID,
                'client_secret': settings.GOOGLE_OAUTH2_CLIENT_SECRET,
                'redirect_uri': settings.GOOGLE_OAUTH2_REDIRECT_URI,
                'grant_type': 'authorization_code',
            },
            timeout=10,
        )
        if token_response.status_code != 200:
            return _error('Failed to exchange authorization code.', status.HTTP_400_BAD_REQUEST)

        token_data = token_response.json()
        id_token = token_data.get('id_token')

        # Decode ID token to get user info
        userinfo_response = http_requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {token_data["access_token"]}'},
            timeout=10,
        )
        if userinfo_response.status_code != 200:
            return _error('Failed to fetch user info.', status.HTTP_400_BAD_REQUEST)

        userinfo = userinfo_response.json()
        email = userinfo.get('email')
        name = userinfo.get('name', '')
        google_uid = userinfo.get('sub')

        # Find or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],
                'first_name': userinfo.get('given_name', name),
                'last_name': userinfo.get('family_name', ''),
                'oauth_provider': 'google',
                'oauth_uid': google_uid,
                'is_email_verified': True,
            },
        )

        if not created and not user.oauth_provider:
            user.oauth_provider = 'google'
            user.oauth_uid = google_uid
            user.save(update_fields=['oauth_provider', 'oauth_uid'])

        refresh = RefreshToken.for_user(user)
        return _success({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserProfileSerializer(user).data,
        })


# ─── User Profile ─────────────────────────────────────────────────────

class UserProfileView(APIView):
    def get(self, request):
        return _success(UserProfileSerializer(request.user).data)

    def put(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return _error(serializer.errors)
        serializer.save()
        return _success(UserProfileSerializer(request.user).data)


class ChangePasswordView(APIView):
    def put(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return _error(serializer.errors)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return _success({'detail': 'Password changed.'})


# ─── API Keys ─────────────────────────────────────────────────────────

class APIKeyListView(APIView):
    required_permission = 'api_keys'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def get(self, request):
        keys = APIKey.objects.filter(user=request.user, is_active=True)
        return _success(APIKeySerializer(keys, many=True).data)


class APIKeyCreateView(APIView):
    required_permission = 'api_keys'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def post(self, request):
        serializer = APIKeyCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors)

        raw_key, key_hash, prefix = APIKey.generate_key()
        api_key = APIKey.objects.create(
            user=request.user,
            name=serializer.validated_data['name'],
            key_hash=key_hash,
            prefix=prefix,
        )
        return _success(
            {
                'id': str(api_key.id),
                'name': api_key.name,
                'key': raw_key,  # Only shown once
                'prefix': prefix,
            },
            status_code=status.HTTP_201_CREATED,
        )


class APIKeyDeleteView(APIView):
    required_permission = 'api_keys'
    permission_classes = [IsAuthenticated, HasRolePermission]

    def delete(self, request, key_id):
        try:
            api_key = APIKey.objects.get(id=key_id, user=request.user)
        except APIKey.DoesNotExist:
            return _error('API key not found.', status.HTTP_404_NOT_FOUND)
        api_key.is_active = False
        api_key.save(update_fields=['is_active'])
        return _success({'detail': 'API key revoked.'})


# ─── Admin: User Management ──────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().order_by('-created_at')
    filterset_fields = ['role', 'is_active', 'is_email_verified']
    search_fields = ['email', 'first_name', 'last_name', 'organization']


class AdminUserRoleUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def put(self, request, user_id):
        serializer = UserRoleUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(serializer.errors)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return _error('User not found.', status.HTTP_404_NOT_FOUND)

        user.role = serializer.validated_data['role']
        user.save(update_fields=['role'])
        return _success(AdminUserSerializer(user).data)


class AdminUserDeactivateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return _error('User not found.', status.HTTP_404_NOT_FOUND)

        user.is_active = False
        user.save(update_fields=['is_active'])
        return _success({'detail': 'User deactivated.'})
