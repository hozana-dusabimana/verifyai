from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Only allow admin users."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin()


class HasRolePermission(BasePermission):
    """Check role-based permission. Set `required_permission` on the view."""

    def has_permission(self, request, view):
        required = getattr(view, 'required_permission', None)
        if not required:
            return True
        return request.user.is_authenticated and request.user.has_role_permission(required)
