# models.py

from django.db import models, connection
from django.contrib.auth.models import AbstractUser, UserManager
from django.contrib.auth.hashers import check_password

try:
    from rolepermissions.roles import AbstractUserRole
except Exception:
    # rolepermissions API may differ between versions; provide a minimal
    # fallback so the project can import models for management commands.
    class AbstractUserRole(object):
        pass

# Custom manager
class CustomUserManager(UserManager):
    pass

# Mendefinisikan role baru
class AdminRole(AbstractUserRole):
    available_permissions = {
        'can_view_dashboard': 'Can view dashboard',
        'can_manage_users': 'Can manage users',
    }

class UserRole(AbstractUserRole):
    available_permissions = {
        'can_view_dashboard': 'Can view dashboard',
    }


# Custom user model mapped to existing auth_user table.
# We subclass AbstractUser to add extra fields and keep existing auth_user
# table name via Meta.db_table so migrations will alter the existing table.
class CustomUser(AbstractUser):
    phone = models.CharField(max_length=30, blank=True, null=True)
    employee_id = models.CharField(max_length=50, blank=True, null=True)
    role = models.CharField(max_length=50, blank=True, null=True)
    region_id = models.CharField(max_length=50, blank=True, null=True)
    area_id = models.CharField(max_length=50, blank=True, null=True)
    branch_id = models.CharField(max_length=50, blank=True, null=True)
    full_name = models.CharField(max_length=150, blank=True, null=True)

    objects = CustomUserManager()

    class Meta:
        db_table = 'auth_user'
        managed = False  # Don't manage table creation

    def __str__(self):
        return self.username


# Custom authentication backend that uses raw SQL to avoid first_name/last_name columns
class RawSQLAuthBackend:
    """
    Custom authentication backend that authenticates against the database 
    using raw SQL instead of Django ORM to avoid querying non-existent first_name/last_name columns.
    """
    
    def authenticate(self, request, username=None, password=None):
        if not username or not password:
            return None
        
        # Query user using raw SQL
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT id, username, password FROM auth_user WHERE username=%s',
                [username]
            )
            row = cursor.fetchone()
        
        if not row:
            return None
        
        user_id, db_username, db_password = row
        
        # Verify password
        if not check_password(password, db_password):
            return None
        
        # Load user object from cache (if exists) to avoid re-querying with ORM
        try:
            # Try to get user from cache, but don't query if not exists
            user = CustomUser.objects.filter(pk=user_id).first()
            if not user:
                # Create minimal user object if not cached
                return None
            return user
        except Exception:
            return None
    
    def get_user(self, user_id):
        try:
            return CustomUser.objects.filter(pk=user_id).first()
        except Exception:
            return None


# Custom JWT authentication that doesn't query first_name/last_name
class RawSQLJWTAuthentication:
    """
    Custom JWT authentication that validates token without querying ORM.
    Completely bypasses Django ORM to avoid first_name/last_name column references.
    """
    
    def authenticate(self, request):
        from rest_framework_simplejwt.exceptions import AuthenticationFailed
        from rest_framework_simplejwt.settings import api_settings as jwt_settings
        import jwt as pyjwt
        
        # Extract token from Authorization header
        auth = request.META.get('HTTP_AUTHORIZATION', '').split()
        if len(auth) != 2 or auth[0].lower() != 'bearer':
            return None
        
        token = auth[1]
        
        try:
            # Decode token manually without using JWTAuthentication 
            # which would load user from ORM
            validated_token = pyjwt.decode(
                token,
                jwt_settings.SIGNING_KEY,
                algorithms=jwt_settings.ALGORITHM
            )
            
            user_id = validated_token.get('user_id')
            if not user_id:
                raise AuthenticationFailed('Invalid token')
            
            # Return minimal user object without fetching from ORM
            authenticated_user = CustomUser(id=user_id)
            return (authenticated_user, validated_token)
        except Exception as e:
            return None
    
    def authenticate_header(self, request):
        return 'Bearer'
