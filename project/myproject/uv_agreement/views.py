"""UV Agreement views moved out of monolith to be app-local and independent."""
import os
import logging
import traceback
import tempfile
import shutil
import zipfile
import re
import json
from datetime import datetime, date as _date

from django.db import connection
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model

from myproject.rbac import get_role_from_request
from myproject.common import (_resolve_username, _get_request_user_and_now, _normalize_for_json,
                              _ensure_synthesized_pk, format_number_dot, number_to_indonesian_words,
                              date_to_indonesian_words, format_indonesian_date, _repair_docx_jinja_tags,
                              _convert_docx_to_pdf, _safe_rmtree)
from myproject.models import DownloadLog

User = get_user_model()
logger = logging.getLogger(__name__)


class UVAgreementView(APIView):
    """
    Mirrors BLAgreementView behavior but operates on uv_agreement and uv_collateral tables.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        contract_number = data.get('contract_number')
        branch_id = data.get('branch_id')
        director = data.get('director')
        bm_data = data.get('bm_data', {})
        contract_data = data.get('contract_data', {})
        collateral_data = data.get('collateral_data', {})
        header_fields = data.get('header_fields', {})

        role = get_role_from_request(request) or getattr(request.user, 'role', '')
        # Only Admin and CSA can create. BM and BOD are read-only (download only)
        allowed_creators = ('Admin', 'CSA')
        if role not in allowed_creators:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        try:
            with connection.cursor() as cursor:
                cursor.execute("SHOW COLUMNS FROM uv_agreement")
                cols_meta = cursor.fetchall()
                cols_info = [row[0] for row in cols_meta]
                try:
                    pk_row = next((r for r in cols_meta if (r[3] or '').upper() == 'PRI'), None)
                    pk_col_name = pk_row[0] if pk_row else None
                except Exception:
                    pk_col_name = None
                cols_lookup = {c.lower(): c for c in cols_info}

                data_map = {}
                if contract_number:
                    data_map['contract_number'] = contract_number

                client_created_by = data.get('created_by')
                if client_created_by and 'created_by' in cols_info:
                    data_map['created_by'] = client_created_by

                user_full_name = None
                user_username = None
                if getattr(request, 'user', None) and getattr(request.user, 'is_authenticated', False):
                    user_full_name = getattr(request.user, 'full_name', None)
                    user_username = getattr(request.user, 'username', None)
                    if (not user_full_name or not user_username) and getattr(request.user, 'id', None):
                        try:
                            u = User.objects.filter(pk=request.user.id).first()
                            if u:
                                user_full_name = user_full_name or getattr(u, 'full_name', None)
                                user_username = user_username or getattr(u, 'username', None)
                        except Exception:
                            pass
                else:
                    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
                    if auth_header and auth_header.startswith('Bearer '):
                        token = auth_header.split(' ', 1)[1].strip()
                        try:
                            payload = AccessToken(token)
                            user_id = payload.get('user_id') or payload.get('uid') or payload.get('id')
                            if user_id:
                                try:
                                    u = User.objects.filter(pk=user_id).first()
                                    if u:
                                        user_full_name = user_full_name or getattr(u, 'full_name', None)
                                        user_username = user_username or getattr(u, 'username', None)
                                except Exception:
                                    pass
                        except TokenError:
                            pass

                user_username = user_username or (user_full_name and user_full_name.replace(' ', '').lower()) or 'anonymous'
                now = timezone.now()

                if branch_id is not None and 'branch_id' in cols_lookup:
                    data_map[cols_lookup['branch_id']] = branch_id
                if director is not None:
                    if 'name_of_director' in cols_lookup:
                        data_map[cols_lookup['name_of_director']] = director
                    elif 'director' in cols_lookup:
                        data_map[cols_lookup['director']] = director

                branch_data = data.get('branch_data', {})
                for src in (bm_data, branch_data, contract_data, collateral_data, header_fields):
                    if not isinstance(src, dict):
                        continue
                    for k, v in src.items():
                        key = str(k).lower()
                        if key == 'name_of_director':
                            key = 'name_of_director'
                        if key in cols_lookup:
                            data_map[cols_lookup[key]] = v

                # Date parsing and default filling similar to BLAgreementView
                field_type_map = {row[0]: row[1].lower() for row in cols_meta}
                for k in list(data_map.keys()):
                    ft = field_type_map.get(k, '')
                    if not any(t in ft for t in ('date', 'timestamp', 'datetime')):
                        continue
                    val = data_map.get(k)
                    if val is None or (isinstance(val, str) and val.strip() == ''):
                        data_map.pop(k, None)
                        continue
                    if isinstance(val, (_date, datetime)):
                        continue
                    s = str(val).strip()
                    parsed = None
                    try:
                        try:
                            parsed = datetime.fromisoformat(s)
                        except Exception:
                            if re.match(r'^\s*\d{1,2}\s+\d{1,2}\s+\d{4}\s*$', s):
                                s = re.sub(r'\s+', '/', s.strip())
                            for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d', '%d %m %Y', '%d %b %Y', '%d %B %Y'):
                                try:
                                    parsed = datetime.strptime(s, fmt)
                                    break
                                except Exception:
                                    continue
                        if parsed is None:
                            data_map.pop(k, None)
                            continue
                        if 'date' in ft and 'time' not in ft and 'datetime' not in ft:
                            data_map[k] = parsed.date()
                        else:
                            if parsed.tzinfo is None:
                                parsed = timezone.make_aware(parsed)
                            data_map[k] = parsed
                    except Exception:
                        data_map.pop(k, None)

                for col_row in cols_meta:
                    field_name = col_row[0]
                    field_type = col_row[1].lower()
                    is_nullable = col_row[2]
                    default_val = col_row[4]
                    if field_name in data_map:
                        continue
                    if field_name in ('id', 'created_by', 'created_at', 'update_at') or (pk_col_name and field_name == pk_col_name):
                        continue
                    if is_nullable == 'NO' and default_val is None:
                        if any(t in field_type for t in ('int', 'decimal', 'float', 'double')):
                            data_map[field_name] = 0
                        elif any(t in field_type for t in ('date', 'timestamp', 'datetime')):
                            data_map[field_name] = timezone.now()
                        else:
                            data_map[field_name] = '-'

                # Normalize certain text fields to Title Case (Capital Each Word)
                def _title_each_word(val):
                    if val is None:
                        return val
                    if not isinstance(val, str):
                        return val
                    s = val.strip()
                    if not s:
                        return s
                    return ' '.join([w.capitalize() for w in s.split()])

                _titlecase_fields = [
                    'name_of_debtor','place_birth_of_debtor','date_birth_of_debtor_in_word',
                    'street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor',
                    'business_type','name_of_account_holder','loan_amount_in_word','term_by_word','flat_rate_by_word',
                    'notaris_fee_in_word','admin_fee_in_word','mortgage_amount_in_word','net_amount_in_word',
                    'admin_rate_in_word','tlo_in_word','life_insurance_in_word',
                    # Collateral / vehicle fields
                    'vehicle_type','vehicle_brand','vehicle_model','vehicle_colour','bpkb_number','name_bpkb_owner','name_of_vehicle_owner'
                ]
                for _f in _titlecase_fields:
                    if _f in data_map:
                        try:
                            data_map[_f] = _title_each_word(data_map[_f])
                        except Exception:
                            pass

                existing_check_sql = "SELECT contract_number FROM uv_agreement WHERE contract_number=%s"
                exists = None
                if contract_number:
                    cursor.execute(existing_check_sql, [contract_number])
                    exists = cursor.fetchone()

                edit_only = bool(data.get('edit_only'))
                create_only = bool(data.get('create_only'))

                if exists:
                    if create_only:
                        return Response({'error': 'Record already exists (create_only specified)'}, status=status.HTTP_400_BAD_REQUEST)
                    if 'update_at' in cols_info:
                        data_map['update_at'] = now
                    if 'updated_at' in cols_info:
                        data_map['updated_at'] = now
                    data_map.pop('created_by', None)
                    data_map.pop('created_at', None)
                    set_cols = []
                    params = []
                    for col, val in data_map.items():
                        if col == 'contract_number':
                            continue
                        set_cols.append(f"{col}=%s")
                        params.append(val)
                    if set_cols:
                        sql = f"UPDATE uv_agreement SET {', '.join(set_cols)} WHERE contract_number=%s"
                        params.append(contract_number)
                        cursor.execute(sql, params)
                else:
                    if edit_only:
                        return Response({'error': 'Record not found for update (edit_only specified)'}, status=status.HTTP_400_BAD_REQUEST)
                    if 'created_by' in cols_info and user_username:
                        data_map['created_by'] = user_username
                    if 'created_at' in cols_info:
                        data_map[cols_lookup['created_at']] = now if 'created_at' in cols_lookup else now
                    if 'updated_at' in cols_info:
                        data_map[cols_lookup['updated_at']] = now if 'updated_at' in cols_lookup else now
                    if 'update_at' in cols_info and 'update_at' not in data_map:
                        data_map['update_at'] = now

                    try:
                        _ensure_synthesized_pk(cursor, cols_meta, data_map, 'uv_agreement')
                    except Exception:
                        pass

                    try:
                        pk_row = next((r for r in cols_meta if (r[3] or '').upper() == 'PRI'), None)
                        if pk_row:
                            pk_name = pk_row[0]
                            if pk_name in data_map and (data_map[pk_name] is None or str(data_map[pk_name]) in ('', '0')):
                                data_map.pop(pk_name, None)
                    except Exception:
                        pass

                    cols = []
                    placeholders = []
                    params = []
                    for col, val in data_map.items():
                        cols.append(col)
                        placeholders.append('%s')
                        params.append(val)
                    sql = f"INSERT INTO uv_agreement ({', '.join(cols)}) VALUES ({', '.join(placeholders)})"
                    try:
                        cursor.execute(sql, params)
                    except Exception as ie:
                        msg = str(ie)
                        if 'Duplicate entry' in msg and 'PRIMARY' in msg:
                            logger.warning('Duplicate primary on uv_agreement insert: %s', msg)
                            if contract_number:
                                try:
                                    set_cols = []
                                    params2 = []
                                    for col, val in data_map.items():
                                        if col == 'contract_number':
                                            continue
                                        set_cols.append(f"{col}=%s")
                                        params2.append(val)
                                    if set_cols:
                                        update_sql = f"UPDATE uv_agreement SET {', '.join(set_cols)} WHERE contract_number=%s"
                                        params2.append(contract_number)
                                        cursor.execute(update_sql, params2)
                                except Exception:
                                    logger.exception('Failed safe-update after duplicate insert into uv_agreement')
                            else:
                                logger.warning('Duplicate primary but no contract_number available; skipping insert')
                        else:
                            raise
            return Response({'message': 'Data berhasil disimpan'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        contract_number = request.query_params.get('contract_number') or request.GET.get('contract_number')
        try:
            with connection.cursor() as cursor:
                if not contract_number:
                    # List all UV agreements
                    cursor.execute("SHOW COLUMNS FROM uv_agreement")
                    cols_meta = cursor.fetchall()
                    cols_info = [row[0] for row in cols_meta]
                    cols_lookup_lower = [c.lower() for c in cols_info]

                    role = get_role_from_request(request) or getattr(request.user, 'role', '')
                    username = getattr(request.user, 'username', None) or ' '

                    where_clauses = []
                    params = []

                    if role == 'CSA':
                        user_branch = getattr(request.user, 'branch_id', None)
                        if user_branch is None:
                            return Response({'error': 'Branch not configured for user'}, status=status.HTTP_403_FORBIDDEN)
                        if 'branch_id' in cols_lookup_lower:
                            col = next(c for c in cols_info if c.lower() == 'branch_id')
                            where_clauses.append(f"{col} = %s")
                            params.append(user_branch)
                        else:
                            return Response({'error': 'branch_id column missing in uv_agreement'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    elif role == 'BM':
                        user_branch = getattr(request.user, 'branch_id', None)
                        if user_branch is None:
                            return Response({'error': 'Branch not configured for user'}, status=status.HTTP_403_FORBIDDEN)
                        if 'branch_id' in cols_lookup_lower:
                            col = next(c for c in cols_info if c.lower() == 'branch_id')
                            where_clauses.append(f"{col} = %s")
                            params.append(user_branch)
                        else:
                            return Response({'error': 'branch_id column missing in uv_agreement'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    elif role == 'AM':
                        user_area = getattr(request.user, 'area_id', None)
                        if user_area is None:
                            return Response({'error': 'Area not configured for user'}, status=status.HTTP_403_FORBIDDEN)
                        if 'branch_id' in cols_lookup_lower:
                            try:
                                cursor.execute('SELECT id FROM branches WHERE area_id=%s', [user_area])
                                bids = [r[0] for r in cursor.fetchall()]
                            except Exception:
                                bids = []
                            if not bids:
                                where_clauses.append('1=0')
                            else:
                                col = next(c for c in cols_info if c.lower() == 'branch_id')
                                if len(bids) == 1:
                                    where_clauses.append(f"{col} = %s")
                                    params.append(bids[0])
                                else:
                                    placeholders = ','.join(['%s'] * len(bids))
                                    where_clauses.append(f"{col} IN ({placeholders})")
                                    params.extend(bids)
                        elif 'area_id' in cols_lookup_lower:
                            col = next(c for c in cols_info if c.lower() == 'area_id')
                            where_clauses.append(f"{col} = %s")
                            params.append(user_area)
                        else:
                            return Response({'error': 'area_id/branch_id column missing in uv_agreement'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    elif role == 'RM':
                        user_region = getattr(request.user, 'region_id', None)
                        if user_region is None:
                            return Response({'error': 'Region not configured for user'}, status=status.HTTP_403_FORBIDDEN)
                        if 'branch_id' in cols_lookup_lower:
                            try:
                                cursor.execute('SELECT b.id FROM branches b JOIN areas a ON b.area_id = a.id WHERE a.region_id=%s', [user_region])
                                bids = [r[0] for r in cursor.fetchall()]
                            except Exception:
                                bids = []
                            if not bids:
                                where_clauses.append('1=0')
                            else:
                                col = next(c for c in cols_info if c.lower() == 'branch_id')
                                if len(bids) == 1:
                                    where_clauses.append(f"{col} = %s")
                                    params.append(bids[0])
                                else:
                                    placeholders = ','.join(['%s'] * len(bids))
                                    where_clauses.append(f"{col} IN ({placeholders})")
                                    params.extend(bids)
                        elif 'region_id' in cols_lookup_lower:
                            col = next(c for c in cols_info if c.lower() == 'region_id')
                            where_clauses.append(f"{col} = %s")
                            params.append(user_region)
                        else:
                            return Response({'error': 'region_id/branch_id column missing in uv_agreement'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    elif role in ('Admin', 'BOD'):
                        pass
                    else:
                        where_clauses.append('1=0')

                    base_sql = "SELECT agreement_date, contract_number, name_of_debtor, nik_number_of_debtor, vehicle_type, created_by FROM uv_agreement"
                    if where_clauses:
                        sql = base_sql + ' WHERE ' + ' AND '.join(where_clauses) + ' ORDER BY COALESCE(agreement_date, created_at) DESC'
                        cursor.execute(sql, params)
                    else:
                        cursor.execute(base_sql + ' ORDER BY COALESCE(agreement_date, created_at) DESC')

                    cols = [c[0] for c in cursor.description] if cursor.description else []
                    rows = cursor.fetchall()
                    items = [dict(zip(cols, r)) for r in rows]
                    return Response({'agreements': _normalize_for_json(items)}, status=status.HTTP_200_OK)

                # ── mode=create: always fetch from source tables (contract + uv_collateral) ──
                mode = request.query_params.get('mode', '').strip().lower()

                if mode == 'create':
                    # Debtor data from `contract` table
                    cursor.execute(
                        "SELECT * FROM contract WHERE LOWER(contract_number) = LOWER(%s) LIMIT 1",
                        [contract_number]
                    )
                    c_cols = [col[0] for col in cursor.description] if cursor.description else []
                    c_row = cursor.fetchone()
                    debtor_data = dict(zip(c_cols, c_row)) if c_row else None

                    # Collateral data from `uv_collateral` table
                    collateral_data = None
                    try:
                        cursor.execute(
                            "SELECT * FROM uv_collateral WHERE LOWER(contract_number) = LOWER(%s) LIMIT 1",
                            [contract_number]
                        )
                        coll_cols = [col[0] for col in cursor.description] if cursor.description else []
                        coll_row = cursor.fetchone()
                        if coll_row:
                            coll_dict = dict(zip(coll_cols, coll_row))
                            # Remove meta keys
                            for mk in ('id', 'created_at', 'updated_at', 'created_by', 'update_at', 'contract_number'):
                                coll_dict.pop(mk, None)
                            collateral_data = coll_dict
                    except Exception:
                        pass

                    if not debtor_data:
                        return Response({
                            'debtor': None,
                            'collateral': None,
                            'branch_manager': {},
                            'branch': {},
                            'message': 'Data tidak ditemukan untuk nomor kontrak ini',
                            'source': 'create'
                        }, status=status.HTTP_404_NOT_FOUND)

                    # Remove meta fields from debtor
                    for mk in ('id', 'created_at', 'updated_at', 'created_by', 'update_at'):
                        debtor_data.pop(mk, None)

                    return Response({
                        'debtor': _normalize_for_json(debtor_data),
                        'collateral': _normalize_for_json(collateral_data),
                        'branch_manager': {},
                        'branch': {},
                        'source': 'create'
                    }, status=status.HTTP_200_OK)

                # ── mode=edit (default): fetch from uv_agreement table ──
                # Get specific UV agreement by contract_number
                cursor.execute(
                    "SELECT * FROM uv_agreement WHERE LOWER(contract_number) = LOWER(%s) LIMIT 1",
                    [contract_number]
                )
                cols = [col[0] for col in cursor.description] if cursor.description else []
                uv_row = cursor.fetchone()
                uv_data = dict(zip(cols, uv_row)) if uv_row else None

                if uv_data:
                    # Split uv_data into 4 field groups from uv_agreement table only
                    collateral_fields = {
                        'wheeled_vehicle', 'vehicle_type', 'vehicle_brand', 'vehicle_model',
                        'plate_number', 'chassis_number', 'engine_number', 'manufactured_year',
                        'vehicle_colour', 'bpkb_number', 'name_bpkb_owner'
                    }
                    
                    branch_manager_fields = {
                        'name_of_bm', 'place_birth_of_bm', 'date_birth_of_bm', 'date_birth_of_bm_in_word',
                        'street_of_bm', 'subdistrict_of_bm', 'district_of_bm', 'city_of_bm', 
                        'province_of_bm', 'nik_number_of_bm', 'phone_number_of_bm'
                    }
                    
                    branch_fields = {
                        'street_name', 'subdistrict', 'district', 'city', 'province', 'branch_id'
                    }
                    
                    # Fields to exclude from debtor (internal/meta fields)
                    meta_fields = {'id', 'created_at', 'updated_at', 'created_by'}
                    non_debtor_fields = collateral_fields | branch_manager_fields | branch_fields | meta_fields
                    
                    # Parse data into 4 field groups — debtor is catch-all for remaining fields
                    collateral_data = {k: v for k, v in uv_data.items() if k in collateral_fields}
                    branch_manager_data = {k: v for k, v in uv_data.items() if k in branch_manager_fields}
                    branch_data = {k: v for k, v in uv_data.items() if k in branch_fields}
                    debtor_data = {k: v for k, v in uv_data.items() if k not in non_debtor_fields}

                    return Response({
                        'debtor': _normalize_for_json(debtor_data), 
                        'collateral': _normalize_for_json(collateral_data),
                        'branch_manager': _normalize_for_json(branch_manager_data),
                        'branch': _normalize_for_json(branch_data),
                        'source': 'uv_agreement'
                    }, status=status.HTTP_200_OK)

                # Fallback: no agreement exists yet, fetch from source tables
                cursor.execute(
                    "SELECT * FROM contract WHERE LOWER(contract_number) = LOWER(%s) LIMIT 1",
                    [contract_number]
                )
                columns = [col[0] for col in cursor.description] if cursor.description else []
                contract_row = cursor.fetchone()
                debtor_data = dict(zip(columns, contract_row)) if contract_row else None

                # Also try uv_collateral for fallback
                collateral_data = None
                try:
                    cursor.execute(
                        "SELECT * FROM uv_collateral WHERE LOWER(contract_number) = LOWER(%s) LIMIT 1",
                        [contract_number]
                    )
                    coll_cols = [col[0] for col in cursor.description] if cursor.description else []
                    coll_row = cursor.fetchone()
                    if coll_row:
                        coll_dict = dict(zip(coll_cols, coll_row))
                        for mk in ('id', 'created_at', 'updated_at', 'created_by', 'update_at', 'contract_number'):
                            coll_dict.pop(mk, None)
                        collateral_data = coll_dict
                except Exception:
                    pass

                if not debtor_data:
                    return Response({
                        'debtor': None,
                        'collateral': None,
                        'branch_manager': {},
                        'branch': {},
                        'message': 'Data tidak ditemukan untuk nomor kontrak ini'
                    }, status=status.HTTP_404_NOT_FOUND)

                return Response({
                    'debtor': _normalize_for_json(debtor_data),
                    'collateral': _normalize_for_json(collateral_data),
                    'branch_manager': {},
                    'branch': {},
                    'source': 'contract_fallback'
                }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UVCollateralCreateView(APIView):
    """Create or update UV collateral rows (mirrors BL collateral handler semantics)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        contract_number = request.query_params.get('contract_number') or request.GET.get('contract_number')
        if not contract_number:
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SHOW COLUMNS FROM uv_collateral")
                    cols_meta = cursor.fetchall()
                    cols_info = [row[0] for row in cols_meta]
                return Response({'collateral': [], 'columns': cols_info}, status=status.HTTP_200_OK)
            except Exception as e:
                logger.exception('UVCollateral columns lookup failed')
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        try:
            with connection.cursor() as cursor:
                cursor.execute("SHOW COLUMNS FROM uv_collateral")
                cols_meta = cursor.fetchall()
                cols_info = [row[0] for row in cols_meta]
                sql = f"SELECT {', '.join(cols_info)} FROM uv_collateral WHERE LOWER(contract_number)=LOWER(%s)"
                cursor.execute(sql, [contract_number])
                rows = cursor.fetchall()
                result = []
                for row in rows:
                    row_dict = {cols_info[i]: row[i] for i in range(len(cols_info))}
                    result.append(row_dict)
                return Response({'collateral': result, 'columns': cols_info}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('UVCollateral lookup failed')
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        data = request.data
        contract_number = data.get('contract_number')
        collateral = data.get('collateral', {})
        if not contract_number:
            return Response({'error': 'contract_number is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with connection.cursor() as cursor:
                cursor.execute("SHOW COLUMNS FROM uv_collateral")
                cols_meta = cursor.fetchall()
                cols_info = [r[0] for r in cols_meta]
                cols_lookup = {c.lower(): c for c in cols_info}

                try:
                    data_map = {'contract_number': str(contract_number).upper()}
                except Exception:
                    data_map = {'contract_number': contract_number}
                if isinstance(collateral, dict):
                    for k, v in collateral.items():
                        key = str(k).lower()
                        if key in cols_lookup:
                            data_map[cols_lookup[key]] = v

                # Normalize certain string fields to uppercase server-side
                try:
                    upper_fields = set(['vehicle_model', 'plate_number', 'plat_number', 'chassis_number', 'engine_number', 'bpkb_number', 'sp3_number'])
                    for col in list(data_map.keys()):
                        try:
                            if col and isinstance(col, str) and col.lower() in upper_fields:
                                val = data_map.get(col)
                                if isinstance(val, str):
                                    data_map[col] = val.upper()
                        except Exception:
                            # non-fatal normalization error; continue
                            pass
                except Exception:
                    pass

                # Title-case certain human-readable fields (capitalize each word)
                try:
                    title_fields = set(['vehicle_type', 'vehicle_brand', 'vehicle_colour', 'name_bpkb_owner'])
                    for col in list(data_map.keys()):
                        try:
                            if col and isinstance(col, str) and col.lower() in title_fields:
                                val = data_map.get(col)
                                if isinstance(val, str):
                                    # simple title-case per word
                                    data_map[col] = ' '.join([w.capitalize() for w in str(val).split()])
                        except Exception:
                            pass
                except Exception:
                    pass

                for col_row in cols_meta:
                    field_name = col_row[0]
                    field_type = col_row[1].lower()
                    is_nullable = col_row[2]
                    default_val = col_row[4]
                    if field_name in data_map:
                        continue
                    if field_name in ('id', 'created_by', 'created_at', 'update_at'):
                        continue
                    if is_nullable == 'NO' and default_val is None:
                        if any(t in field_type for t in ('int', 'decimal', 'float', 'double')):
                            data_map[field_name] = 0
                        elif any(t in field_type for t in ('date', 'timestamp', 'datetime')):
                            data_map[field_name] = timezone.now()
                        else:
                            data_map[field_name] = ''

                now = timezone.now()
                username = _resolve_username(request)
                if 'created_by' in cols_info and 'created_by' not in data_map:
                    data_map['created_by'] = username or ''
                if 'created_at' in cols_info and 'created_at' not in data_map:
                    data_map['created_at'] = now
                if 'update_at' in cols_info and 'update_at' not in data_map:
                    data_map['update_at'] = now

                cols = []
                placeholders = []
                params = []
                for col, val in data_map.items():
                    cols.append(col)
                    placeholders.append('%s')
                    params.append(val)
                sql = f"INSERT INTO uv_collateral ({', '.join(cols)}) VALUES ({', '.join(placeholders)})"
                cursor.execute(sql, params)
            return Response({'message': 'UV collateral saved'}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('Failed to save uv_collateral')
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UVAgreementDocxDownloadView(APIView):
    """Generate a DOCX from UV template for a given contract_number and return as attachment.
    Supports both UV Agreement and UV SP3 download via ?type=agreement (default) or ?type=sp3
    Both document types use data from uv_agreement table, differing only in template format.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        contract_number = request.query_params.get('contract_number', '').strip()
        if not contract_number:
            return Response({'error': 'contract_number parameter required'}, status=status.HTTP_400_BAD_REQUEST)

        doc_type = request.query_params.get('type', 'agreement').strip().lower()
        
        # Determine template path and database queries based on doc_type
        if doc_type == 'sp3':
            template_path = os.path.join(settings.BASE_DIR, 'templates', 'docx', 'uv_sp3_template.docx')
            doc_name = 'uv_sp3'
        else:
            template_path = os.path.join(settings.BASE_DIR, 'templates', 'docx', 'uv_agreement_template.docx')
            doc_name = 'uv_agreement'
        
        if not os.path.exists(template_path):
            return Response({'error': f'UV template not found at {template_path}. Please place your .docx template there.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            with connection.cursor() as cursor:
                # Both document types use uv_agreement table data
                # (SP3 and Agreement differ only in template, not in source data)
                cursor.execute('SELECT * FROM uv_agreement WHERE contract_number=%s LIMIT 1', [contract_number])
                agreement_row = cursor.fetchone()
                agreement_cols = [c[0] for c in cursor.description] if cursor.description else []
                agreement = dict(zip(agreement_cols, agreement_row)) if agreement_row else {}

                cursor.execute('SELECT * FROM uv_collateral WHERE contract_number=%s LIMIT 1', [contract_number])
                coll_row = cursor.fetchone()
                coll_cols = [c[0] for c in cursor.description] if cursor.description else []
                collateral = dict(zip(coll_cols, coll_row)) if coll_row else {}
                
                main_data = agreement

        except Exception as db_e:
            logger.exception('UV Agreement DB lookup failed')
            return Response({'error': str(db_e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        ctx = {}
        if isinstance(main_data, dict):
            role = get_role_from_request(request) or getattr(request.user, 'role', '')
            username = getattr(request.user, 'username', None) or _resolve_username(request) or ''
            if role in ('Admin', 'BOD'):
                pass
            elif role == 'CSA':
                if main_data.get('created_by') != username:
                    return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
            elif role == 'BM':
                user_branch = getattr(request.user, 'branch_id', None)
                if user_branch is None or str(main_data.get('branch_id')) != str(user_branch):
                    return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
            elif role == 'AM':
                user_area = getattr(request.user, 'area_id', None)
                if user_area is None:
                    return Response({'error': 'Area not configured for user'}, status=status.HTTP_403_FORBIDDEN)
                main_branch = main_data.get('branch_id')
                if main_branch is not None:
                    try:
                        cursor.execute('SELECT area_id FROM branches WHERE id=%s', [main_branch])
                        r = cursor.fetchone()
                        if r and r[0] != user_area:
                            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
                    except Exception:
                        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        # Merge data into ctx (prioritize main_data, then agreement, then collateral).
        # When collateral provides a non-empty value, prefer it over agreement values
        try:
            if isinstance(main_data, dict):
                for k, v in main_data.items():
                    ctx[k] = v
            if isinstance(agreement, dict):
                for k, v in agreement.items():
                    if k not in ctx or ctx.get(k) in (None, ''):
                        ctx[k] = v
            if isinstance(collateral, dict):
                for k, v in collateral.items():
                    try:
                        # prefer collateral values when they are present
                        if v is not None and (not (isinstance(v, str) and v == '')):
                            ctx[k] = v
                        else:
                            # only set if ctx missing or empty
                            if k not in ctx or ctx.get(k) in (None, ''):
                                ctx[k] = v
                    except Exception:
                        if k not in ctx:
                            ctx[k] = v
        except Exception:
            pass

        try:
            ctx['contract_number'] = str(contract_number).upper()
        except Exception:
            ctx['contract_number'] = contract_number

        # Apply numeric formatting (thousand separators + word conversion)
        numeric_keys = ['loan_amount', 'admin_fee', 'net_amount', 'notaris_fee', 'mortgage_amount', 'stamp_amount', 'financing_agreement_amount', 'security_agreement_amount', 'upgrading_land_rights_amount', 'previous_topup_amount', 'total_amount', 'surface_area', 'capacity_of_building', 'handling_fee', 'tlo', 'life_insurance']
        for nk in numeric_keys:
            val = ctx.get(nk)
            try:
                ctx[nk] = format_number_dot(val) if val is not None else ''
            except Exception:
                ctx[nk] = val
            try:
                ctx[nk + '_in_word'] = number_to_indonesian_words(val, title_case=True) if val is not None else ''
            except Exception:
                ctx[nk + '_in_word'] = ''

        # Apply date formatting (Indonesian format + word conversion)
        date_keys = ['agreement_date', 'date_birth_of_debtor', 'date_birth_of_bm', 'sp3_date', 'date_of_delegated']
        for dk in date_keys:
            v = ctx.get(dk)
            try:
                ctx[dk] = format_indonesian_date(v) if v else ''
                ctx[dk + '_in_word'] = date_to_indonesian_words(v, title_case=True) if v else ''
                ctx[dk + '_display'] = f"({format_indonesian_date(v)})" if v else ''
            except Exception:
                ctx[dk + '_in_word'] = ''

        # Rate fields: convert dot decimal to comma for document display
        rate_keys = ['flat_rate', 'admin_rate']
        for rk in rate_keys:
            val = ctx.get(rk)
            if val is not None and val != '':
                ctx[rk] = str(val).replace('.', ',')

        try:
            from docxtpl import DocxTemplate
        except Exception as imp_e:
            logger.error('docxtpl import failed for UV Agreement: %s', str(imp_e))
            if getattr(settings, 'DEBUG', False):
                return Response({'error': 'docxtpl import failed', 'detail': str(imp_e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response({'error': 'docxtpl not installed. Please install with `pip install docxtpl`.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            repaired_template = _repair_docx_jinja_tags(template_path, contract_no=contract_number)
            tpl = DocxTemplate(repaired_template)
            tpl.render(ctx)
            fd, outpath = tempfile.mkstemp(suffix='.docx')
            os.close(fd)
            tpl.save(outpath)
        except Exception as render_e:
            logger.exception('Failed to render UV Agreement DOCX: %s', str(render_e))
            return Response({'error': 'Failed to generate DOCX', 'detail': str(render_e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            download = request.query_params.get('download', '').strip().lower()
            if download == 'pdf':
                pdf_path = os.path.join(tempfile.mkdtemp(prefix='pdf_out_'), f'{doc_name}_{contract_number}.pdf')
                ok, err = _convert_docx_to_pdf(outpath, pdf_path)
                if ok:
                    with open(pdf_path, 'rb') as fh:
                        pdf_bytes = fh.read()
                    response = HttpResponse(pdf_bytes, content_type='application/pdf')
                    download_filename = f'{doc_name}_{contract_number}.pdf'.upper()
                    response['Content-Disposition'] = f'attachment; filename="{download_filename}"'
                    try:
                        ip = request.META.get('HTTP_X_FORWARDED_FOR') or request.META.get('REMOTE_ADDR') or ''
                        if ip and ',' in ip:
                            ip = ip.split(',')[0].strip()
                        ua = request.META.get('HTTP_USER_AGENT', '')
                        user = getattr(request, 'user', None)
                        uid = getattr(user, 'id', None) if user and getattr(user, 'is_authenticated', False) else None
                        uname = getattr(user, 'username', None) if user and getattr(user, 'is_authenticated', False) else _resolve_username(request) or ''
                        email = getattr(user, 'email', None) if user and getattr(user, 'is_authenticated', False) else ''
                        DownloadLog.objects.create(
                            user_id=uid,
                            username=uname,
                            email=email,
                            file_type='uv',
                            file_identifier=str(contract_number),
                            filename=download_filename,
                            ip_address=ip,
                            user_agent=ua,
                            success=True,
                            file_size=len(pdf_bytes),
                            method='stream',
                        )
                    except Exception:
                        logger.exception('Failed to write DownloadLog for UV PDF %s', contract_number)
                    return response
                else:
                    return Response({'error': 'PDF conversion failed', 'detail': str(err)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                with open(outpath, 'rb') as fh:
                    docx_bytes = fh.read()
                response = HttpResponse(docx_bytes, content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
                download_filename = f'{doc_name}_{contract_number}.docx'.upper()
                response['Content-Disposition'] = f'attachment; filename="{download_filename}"'
                try:
                    ip = request.META.get('HTTP_X_FORWARDED_FOR') or request.META.get('REMOTE_ADDR') or ''
                    if ip and ',' in ip:
                        ip = ip.split(',')[0].strip()
                    ua = request.META.get('HTTP_USER_AGENT', '')
                    user = getattr(request, 'user', None)
                    uid = getattr(user, 'id', None) if user and getattr(user, 'is_authenticated', False) else None
                    uname = getattr(user, 'username', None) if user and getattr(user, 'is_authenticated', False) else _resolve_username(request) or ''
                    email = getattr(user, 'email', None) if user and getattr(user, 'is_authenticated', False) else ''
                    DownloadLog.objects.create(
                        user_id=uid,
                        username=uname,
                        email=email,
                        file_type='uv',
                        file_identifier=str(contract_number),
                        filename=download_filename,
                        ip_address=ip,
                        user_agent=ua,
                        success=True,
                        file_size=len(docx_bytes),
                        method='stream',
                    )
                except Exception:
                    logger.exception('Failed to write DownloadLog for UV DOCX %s', contract_number)
                return response
        finally:
            try:
                if outpath and os.path.exists(outpath):
                    os.remove(outpath)
            except Exception:
                pass


__all__ = ['UVAgreementView', 'UVAgreementDocxDownloadView', 'UVCollateralCreateView']
