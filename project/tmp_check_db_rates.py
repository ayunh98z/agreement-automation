# tmp_check_db_rates.py
# Query the DB using Django settings and print last 10 contracts flat_rate/admin_rate

import os, sys, json
sys.path.insert(0, r'C:\laragon\www\lolc\operasional\project')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
import django
django.setup()
from django.db import connection

def get_latest_contracts(limit=10):
    with connection.cursor() as cur:
        cur.execute('SELECT contract_number, flat_rate, admin_rate FROM contract ORDER BY id DESC LIMIT %s', [limit])
        cols = [c[0] for c in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    return rows

if __name__ == '__main__':
    rows = get_latest_contracts(10)
    print(json.dumps(rows, default=str, indent=2, ensure_ascii=False))
