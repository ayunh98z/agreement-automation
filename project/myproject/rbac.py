from rest_framework.permissions import BasePermission


def get_role_from_request(request):
    """Simple resolver that returns the role of the authenticated user.

    This conservative implementation avoids token parsing and caching
    and simply reads `request.user.role` when available.
    """
    try:
        user = getattr(request, 'user', None)
        if user is None:
            return None
        return getattr(user, 'role', None)
    except Exception:
        return None


class RolePermission(BasePermission):
    """Minimal permission class.

    - If `view.required_roles` is not set, allow access.
    - Otherwise allow only if `request.user.role` is present in the list
      (case-insensitive comparison).
    - `has_object_permission` grants access to `admin`/`bod` roles and denies otherwise.
    """

    def has_permission(self, request, view):
        required = getattr(view, 'required_roles', None)
        if not required:
            return True

        role = get_role_from_request(request)
        if not isinstance(role, str):
            return False

        role_norm = role.strip().lower()
        required_norm = [r.strip().lower() for r in required]

        # Allow `audit` role to perform safe (read-only) requests even when
        # the view's `required_roles` does not include it. Unsafe methods
        # continue to require explicit membership in `required_roles`.
        if request.method in ('GET', 'HEAD', 'OPTIONS') and role_norm == 'audit':
            return True

        return role_norm in required_norm

    def has_object_permission(self, request, view, obj):
        role = get_role_from_request(request) or ''
        try:
            role_norm = role.strip().lower()
        except Exception:
            role_norm = ''

        # Admin/BOD retain full object-level access
        if role_norm in ('admin', 'bod'):
            return True

        # Audit can access objects for read-only methods
        if role_norm == 'audit' and request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True

        return False
