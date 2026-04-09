from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db import connection
from django.contrib.auth.hashers import make_password, check_password
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from myproject.user_management.serializers import UserSerializer
from myproject.rbac import RolePermission, get_role_from_request
from myproject.common import _resolve_username
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'User created successfully'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SimpleLoginView(APIView):
    permission_classes = []

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            return Response({'error': 'Username dan password harus diisi'}, status=status.HTTP_400_BAD_REQUEST)
        with connection.cursor() as cursor:
            cursor.execute('SELECT id, username, password, email, full_name, role, is_staff, is_active, branch_id, area_id, region_id FROM auth_user WHERE username=%s', [username])
            row = cursor.fetchone()
        if not row:
            return Response({'error': 'Username atau password salah'}, status=status.HTTP_401_UNAUTHORIZED)
        user_id, db_username, db_password, db_email, db_full_name, db_role, db_is_staff, db_is_active, db_branch_id, db_area_id, db_region_id = row
        if not check_password(password, db_password):
            return Response({'error': 'Username atau password salah'}, status=status.HTTP_401_UNAUTHORIZED)

        # Deny login if account inactive
        try:
            s = str(db_is_active).strip().lower()
            if s in ('0', 'false', 'f', 'no', 'n'):
                return Response({'error': 'Akun tidak aktif. Hubungi administrator.'}, status=status.HTTP_403_FORBIDDEN)
            try:
                if int(db_is_active) == 0:
                    return Response({'error': 'Akun tidak aktif. Hubungi administrator.'}, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                pass
        except Exception:
            return Response({'error': 'Akun tidak aktif. Hubungi administrator.'}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken()
        refresh['user_id'] = user_id
        refresh['username'] = db_username
        access_token = refresh.access_token
        return Response({
            'access': str(access_token),
            'refresh': str(refresh),
            'user': {
                'id': user_id,
                'username': db_username,
                'email': db_email,
                'full_name': db_full_name,
                'role': db_role,
                'is_staff': bool(db_is_staff),
                'is_active': bool(db_is_active),
                'branch_id': db_branch_id,
                'area_id': db_area_id,
                'region_id': db_region_id,
            }
        }, status=status.HTTP_200_OK)


class UserListCreateView(APIView):
    permission_classes = [IsAuthenticated, RolePermission]
    # Only Admin can manage users. BOD role only has access to agreements (dashboard & download)
    required_roles = ['Admin']

    def get(self, request):
        try:
            # Ensure requester has Admin role only (User management is strictly for Admin)
            from myproject.rbac import get_role_from_request
            role = get_role_from_request(request) or getattr(getattr(request, 'user', None), 'role', None)
            if isinstance(role, str):
                role = role.strip()
            # Allow Admin and Audit to view user list (Audit is read-only)
            if role not in ('Admin', 'Audit'):
                return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

            with connection.cursor() as cursor:
                # Include region/area/branch ids and branch name for frontend display
                cursor.execute(
                    "SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active, u.region_id, u.area_id, u.branch_id, b.name AS branch_name "
                    "FROM auth_user u LEFT JOIN branches b ON u.branch_id = b.id ORDER BY u.username"
                )
                cols = [c[0] for c in cursor.description] if cursor.description else []
                rows = cursor.fetchall()
                users = [dict(zip(cols, r)) for r in rows]
            return Response({'users': users}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        # Only Admin may create users
        role = get_role_from_request(request) or getattr(getattr(request, 'user', None), 'role', None)
        if isinstance(role, str):
            role = role.strip()
        if role != 'Admin':
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user_obj = serializer.save()
                # Return full user row so frontend can immediately show region/area/branch
                with connection.cursor() as cursor:
                    cursor.execute('SELECT id, username, email, full_name, role, is_active, region_id, area_id, branch_id, employee_id FROM auth_user WHERE id=%s', [user_obj.id])
                    cols = [c[0] for c in cursor.description] if cursor.description else []
                    row = cursor.fetchone()
                    user = dict(zip(cols, row)) if row else None
                return Response({'user': user, 'message': 'User created successfully'}, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated, RolePermission]

    def get(self, request, username):
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT * FROM auth_user WHERE username=%s LIMIT 1', [username])
                cols = [c[0] for c in cursor.description] if cursor.description else []
                row = cursor.fetchone()
                user = dict(zip(cols, row)) if row else None
            if not user:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            role = get_role_from_request(request) or getattr(request.user, 'role', None)
            requester = getattr(request.user, 'username', None)
            # BOD has no access to user management; CSA, Audit and BM/AM/RM may view but not edit
            if isinstance(role, str):
                role = role.strip()
            if role not in ('Admin', 'CSA', 'BM', 'AM', 'RM', 'Audit') and requester != username:
                return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
            return Response({'user': user}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, username):
        data = request.data or {}
        # allow updating is_active and location fields as well (admin-only)
        allowed = ['email', 'full_name', 'password', 'role', 'phone', 'is_active', 'region_id', 'area_id', 'branch_id', 'employee_id']
        fields = []
        params = []
        try:
            role = get_role_from_request(request) or getattr(request.user, 'role', None)
            if isinstance(role, str):
                role = role.strip()
            # Disallow updates from BOD, CSA, BM, AM, RM (they may view/action but not modify)
            if role in ('BOD', 'CSA', 'BM', 'AM', 'RM'):
                return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
            if role not in ('Admin',):
                # Non-admins may only update their own account; enforce
                requester = getattr(request.user, 'username', None)
                if requester != username:
                    return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
            # Only Admin may change the role field
            if role != 'Admin':
                data.pop('role', None)
            if 'password' in data and data.get('password'):
                hashed = make_password(data.get('password'))
                fields.append('password=%s')
                params.append(hashed)
            for k in allowed:
                if k == 'password':
                    continue
                if k in data:
                    # ensure boolean/integer conversion for is_active
                    if k == 'is_active':
                        try:
                            v = data.get(k)
                            if isinstance(v, str):
                                s = v.strip().lower()
                                if s in ('0', 'false', 'f', 'no', 'n'):
                                    v = 0
                                else:
                                    v = 1
                            else:
                                v = 1 if int(v) != 0 else 0
                        except Exception:
                            v = 1
                        fields.append(f"{k}=%s")
                        params.append(v)
                    # numeric FK fields: accept empty -> NULL, or coerce to int
                    elif k in ('region_id', 'area_id', 'branch_id', 'employee_id'):
                        v = data.get(k)
                        try:
                            if v is None or (isinstance(v, str) and v.strip() == ''):
                                v = None
                            else:
                                # try to coerce to int, otherwise keep as is
                                v = int(v)
                        except Exception:
                            # leave as provided (could be None or invalid string)
                            pass
                        fields.append(f"{k}=%s")
                        params.append(v)
                    else:
                        fields.append(f"{k}=%s")
                        params.append(data.get(k))
            if not fields:
                return Response({'message': 'No fields to update'}, status=status.HTTP_200_OK)
            params.append(username)
            sql = 'UPDATE auth_user SET ' + ', '.join(fields) + ' WHERE username=%s'
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                cursor.execute('SELECT id, username, email, full_name, role, is_active, region_id, area_id, branch_id, employee_id FROM auth_user WHERE username=%s', [username])
                cols = [c[0] for c in cursor.description] if cursor.description else []
                row = cursor.fetchone()
                user = dict(zip(cols, row)) if row else None
            return Response({'user': user, 'message': 'User updated'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, username):
        """Allow Admin to delete a user by username."""
        try:
            role = get_role_from_request(request) or getattr(request.user, 'role', None)
            if isinstance(role, str):
                role = role.strip()
            if role != 'Admin':
                return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

            with connection.cursor() as cursor:
                # perform delete
                cursor.execute('DELETE FROM auth_user WHERE username=%s', [username])
                # cursor.rowcount may not be supported depending on DB API; attempt a lookup when unsure
                try:
                    deleted = cursor.rowcount
                except Exception:
                    deleted = None

            if deleted == 0:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            return Response({'message': 'User deleted'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
