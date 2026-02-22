#!/usr/bin/env python
"""Insert a safe test row into the legacy `contract` table.

This script mirrors the server-side behavior in ContractCreateView:
- discovers columns with SHOW COLUMNS
- only inserts columns that exist
- sets `created_by`, `created_at`, `updated_at` server-side using Django timezone

Run from the repository root using the workspace Python (virtualenv):
    .venv\Scripts\python.exe project\scripts\insert_contract_test.py
"""
import os
import sys
import uuid
from django.utils import timezone

# ensure project root is on sys.path so `myproject` can be imported when
# executing the script from the repo root or from the `project/scripts` folder
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
import django
django.setup()

from django.db import connection


def main():
    # minimal payload - choose a unique contract_number
    unique_suffix = uuid.uuid4().hex[:8].upper()
    payload = {
        'contract_number': f'TEST-CONTRACT-{unique_suffix}',
        'created_by': 'script-insert_contract_test',
    }

    try:
        with connection.cursor() as cursor:
            cursor.execute('SHOW COLUMNS FROM contract')
            cols_meta = cursor.fetchall()
            cols_info = [row[0] for row in cols_meta]
            cols_lookup = {c.lower(): c for c in cols_info}

            # build data_map only for actual columns
            data_map = {}
            for k, v in payload.items():
                key = str(k).lower()
                if key in cols_lookup:
                    data_map[cols_lookup[key]] = v

            # server-side timestamps
            now = timezone.now()
            if 'created_at' in cols_lookup:
                data_map[cols_lookup['created_at']] = now
            if 'updated_at' in cols_lookup:
                data_map[cols_lookup['updated_at']] = now

            # Fill safe defaults for NOT NULL columns that have no default
            # (mirrors server-side ContractCreateView behavior)
            field_type_map = {row[0].lower(): row[1].lower() for row in cols_meta}
            for col_row in cols_meta:
                field_name = col_row[0]
                field_type = col_row[1].lower()
                is_nullable = col_row[2]
                default_val = col_row[4]
                # skip if already provided or auto-managed
                if field_name in data_map:
                    continue
                if field_name in ('id', 'created_by', 'created_at', 'updated_at'):
                    continue

                if is_nullable == 'NO' and default_val is None:
                    if any(t in field_type for t in ('int', 'decimal', 'float', 'double')):
                        if 'decimal' in field_type or 'float' in field_type or 'double' in field_type:
                            data_map[field_name] = 0.0
                        else:
                            data_map[field_name] = 0
                    elif any(t in field_type for t in ('date', 'timestamp', 'datetime')):
                        data_map[field_name] = now
                    else:
                        data_map[field_name] = '-'

            if not data_map:
                print('No valid contract columns found - aborting')
                return 1

            cols = []
            placeholders = []
            params = []
            for col, val in data_map.items():
                cols.append(col)
                placeholders.append('%s')
                params.append(val)

            sql = f"INSERT INTO contract ({', '.join(cols)}) VALUES ({', '.join(placeholders)})"
            cursor.execute(sql, params)
            print('Inserted contract:', payload['contract_number'])
    except Exception as e:
        print('Insert failed:', str(e))
        return 2

    return 0


if __name__ == '__main__':
    sys.exit(main())
