# models.py

from django.db import models, connection, transaction
import logging
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
ROLE_CHOICES = [
    ('Admin', 'Admin'),
    ('CSA', 'CSA'),
    ('SLIK', 'SLIK'),
    ('BM', 'BM'),
    ('AM', 'AM'),
    ('RM', 'RM'),
    ('BOD', 'BOD'),
    ('User', 'User'),
]


class CustomUser(AbstractUser):
    phone = models.CharField(max_length=30, blank=True, null=True)
    employee_id = models.CharField(max_length=50, blank=True, null=True)
    role = models.CharField(max_length=50, blank=True, null=True, choices=ROLE_CHOICES, default='User')
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

            # Try to load essential user fields (role/branch/area/region) so
            # permission checks that rely on those attributes (e.g. CSA branch)
            # work even though we avoid loading full ORM objects everywhere.
            try:
                with connection.cursor() as cursor:
                    cursor.execute(
                        'SELECT id, username, role, branch_id, area_id, region_id, full_name FROM auth_user WHERE id=%s',
                        [user_id]
                    )
                    row = cursor.fetchone()
            except Exception:
                row = None

            if row:
                uid, uname, urole, ubranch, uarea, uregion, ufull = row
                user_obj = CustomUser(id=uid)
                # assign attributes used by views/permissions
                user_obj.username = uname
                user_obj.role = urole
                user_obj.branch_id = ubranch
                user_obj.area_id = uarea
                user_obj.region_id = uregion
                user_obj.full_name = ufull
                return (user_obj, validated_token)

            # Fallback: return minimal user with id only
            authenticated_user = CustomUser(id=user_id)
            return (authenticated_user, validated_token)
        except Exception as e:
            return None
    
    def authenticate_header(self, request):
        return 'Bearer'


class DownloadLog(models.Model):
    FILE_TYPE_CHOICES = (
        ('bl', 'BL'),
        ('uv', 'UV'),
    )
    METHOD_CHOICES = (
        ('stream', 'stream'),
        ('signed_url', 'signed_url'),
    )

    # store user id instead of FK to avoid foreign key type mismatch
    user_id = models.BigIntegerField(blank=True, null=True)
    username = models.CharField(max_length=150, blank=True, null=True)
    email = models.CharField(max_length=254, blank=True, null=True)
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES)
    file_identifier = models.CharField(max_length=255, help_text='ID or path of the downloaded object')
    filename = models.CharField(max_length=255, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    success = models.BooleanField(default=True)
    file_size = models.BigIntegerField(blank=True, null=True)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='stream')

    class Meta:
        db_table = 'download_log'
        verbose_name = 'Download Log'
        verbose_name_plural = 'Download Logs'

    def __str__(self):
        who = self.username or (str(self.user_id) if self.user_id else 'anonymous')
        return f"{who} downloaded {self.filename or self.file_identifier} at {self.timestamp}"


class AgreementAccess(models.Model):
    """Track per-agreement, per-creator access grants for CSA.

    Semantics:
    - `download_grants`: how many downloads are permitted (initial 1)
    - `edit_grants`: how many edit commits are permitted (initial 1)
    - `download_consumed` / `edit_consumed`: counts of uses
    - `locked`: when True no further action allowed
    """
    contract_number = models.CharField(max_length=255, db_index=True)
    user_id = models.BigIntegerField(blank=True, null=True, help_text='creator user id (CSA)')
    role = models.CharField(max_length=50, blank=True, null=True)

    download_grants = models.IntegerField(default=1)
    edit_grants = models.IntegerField(default=1)
    download_consumed = models.IntegerField(default=0)
    edit_consumed = models.IntegerField(default=0)

    locked = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'agreement_access'


class AuditEvent(models.Model):
    contract_number = models.CharField(max_length=255, db_index=True)
    user_id = models.BigIntegerField(blank=True, null=True)
    username = models.CharField(max_length=150, blank=True, null=True)
    action = models.CharField(max_length=50)
    details = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'agreement_audit_event'

    def __str__(self):
        who = self.username or (str(self.user_id) if self.user_id else 'anonymous')
        return f"{self.timestamp.isoformat()} {who} {self.action} {self.contract_number}"

    def can_download(self):
        if self.locked:
            return False
        return (self.download_consumed < self.download_grants)

    def can_edit(self):
        if self.locked:
            return False
        return (self.edit_consumed < self.edit_grants)

    def consume_download(self):
        try:
            with transaction.atomic():
                obj = AgreementAccess.objects.select_for_update().get(pk=self.pk)
                if not obj.can_download():
                    return False
                obj.download_consumed = (obj.download_consumed or 0) + 1
                if (obj.download_consumed >= (obj.download_grants or 0)) and (obj.edit_consumed >= (obj.edit_grants or 0)):
                    obj.locked = True
                obj.save(update_fields=['download_consumed', 'locked', 'updated_at'])
                # refresh self
                self.refresh_from_db()
                try:
                    logger = logging.getLogger(__name__)
                    logger.info('AgreementAccess download consumed: contract=%s user_id=%s consumed=%s/%s locked=%s',
                                self.contract_number, self.user_id, obj.download_consumed, obj.download_grants, obj.locked)
                except Exception:
                    pass
                try:
                    # create persistent audit event
                    AuditEvent.objects.create(
                        contract_number=self.contract_number,
                        user_id=self.user_id,
                        username=None,
                        action='download',
                        details=f'download_consumed={obj.download_consumed} of {obj.download_grants}',
                    )
                except Exception:
                    try:
                        logging.getLogger(__name__).exception('Failed to write AuditEvent for download contract=%s', self.contract_number)
                    except Exception:
                        pass
                return True
        except AgreementAccess.DoesNotExist:
            return False
        except Exception:
            try:
                logging.getLogger(__name__).exception('Error consuming download grant for AgreementAccess id=%s', getattr(self, 'pk', None))
            except Exception:
                pass
            return False

    def consume_edit(self):
        try:
            with transaction.atomic():
                obj = AgreementAccess.objects.select_for_update().get(pk=self.pk)
                if not obj.can_edit():
                    return False
                obj.edit_consumed = (obj.edit_consumed or 0) + 1
                # grant one additional download after successful edit commit
                obj.download_grants = (obj.download_grants or 0) + 1
                if (obj.download_consumed >= (obj.download_grants or 0)) and (obj.edit_consumed >= (obj.edit_grants or 0)):
                    obj.locked = True
                obj.save(update_fields=['edit_consumed', 'download_grants', 'locked', 'updated_at'])
                self.refresh_from_db()
                try:
                    logger = logging.getLogger(__name__)
                    logger.info('AgreementAccess edit consumed: contract=%s user_id=%s edit_consumed=%s edit_grants=%s download_grants=%s locked=%s',
                                self.contract_number, self.user_id, obj.edit_consumed, obj.edit_grants, obj.download_grants, obj.locked)
                except Exception:
                    pass
                try:
                    AuditEvent.objects.create(
                        contract_number=self.contract_number,
                        user_id=self.user_id,
                        username=None,
                        action='edit',
                        details=f'edit_consumed={obj.edit_consumed} edit_grants={obj.edit_grants} download_grants={obj.download_grants}',
                    )
                except Exception:
                    try:
                        logging.getLogger(__name__).exception('Failed to write AuditEvent for edit contract=%s', self.contract_number)
                    except Exception:
                        pass
                return True
        except AgreementAccess.DoesNotExist:
            return False
        except Exception:
            try:
                logging.getLogger(__name__).exception('Error consuming edit grant for AgreementAccess id=%s', getattr(self, 'pk', None))
            except Exception:
                pass
            return False

    @classmethod
    def get_for_contract_and_user(cls, contract_number, user_id):
        return cls.objects.filter(contract_number=contract_number, user_id=user_id).first()

