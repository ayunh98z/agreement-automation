#!/usr/bin/env python
"""Query recent `contract` rows and print stored timestamps (UTC) and WIB conversion.

Run with the workspace Python:
    .venv\Scripts\python.exe project\scripts\check_contract_timestamps.py
"""
import os
import sys
from datetime import datetime

# ensure project root is on sys.path so `myproject` can be imported when
# executing the script from the repo root or from the `project/scripts` folder
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
import django
django.setup()

from django.db import connection
from django.utils import timezone
import pytz

# ensure project root is on sys.path so `myproject` can be imported when
# executing the script from the repo root or from the `project/scripts` folder
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)


def to_wib(dt):
    if dt is None:
        return None
    # ensure aware datetime in UTC
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.utc)
    dt_utc = dt.astimezone(pytz.UTC)
    wib = dt_utc.astimezone(pytz.timezone('Asia/Jakarta'))
    return wib


def main(limit=10):
    try:
        with connection.cursor() as cursor:
            cursor.execute('SHOW COLUMNS FROM contract')
            cols_meta = cursor.fetchall()
            cols = [r[0] for r in cols_meta]
            # prefer contract_id or id for ordering
            id_col = None
            for c in ('contract_id', 'id', 'id_contract'):
                if c in cols:
                    id_col = c
                    break
            order_by = id_col or 'contract_number'

            # pick some timestamp column if present
            ts_col = None
            for cand in ('created_at', 'updated_at', 'created', 'updated'):
                if cand in cols:
                    ts_col = cand
                    break
            if not ts_col:
                print('No timestamp column found in contract table')
                return 1

            sql = f"SELECT {id_col or 'NULL'}, contract_number, {ts_col} FROM contract ORDER BY {order_by} DESC LIMIT %s"
            cursor.execute(sql, [limit])
            rows = cursor.fetchall()
            for r in rows:
                rid, cnum, ts = r[0], r[1], r[2]
                print('contract_id:', rid, 'contract_number:', cnum)
                print('  stored value (raw):', ts)
                try:
                    # Django will return datetime objects for DATETIME/TIMESTAMP
                    if isinstance(ts, datetime):
                        print('  interpreted as UTC-aware:', ts)
                        wib = to_wib(ts)
                        print('  WIB (Asia/Jakarta):', wib)
                    else:
                        print('  non-datetime stored value:', ts)
                except Exception as e:
                    print('  conversion failed:', e)

    except Exception as e:
        print('Query failed:', str(e))
        return 2

    return 0


if __name__ == '__main__':
    sys.exit(main())
