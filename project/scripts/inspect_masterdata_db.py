import os, sys, json
from decimal import Decimal
import datetime

# Ensure project package is on path
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(HERE)
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
import django
django.setup()

from django.db import connection

cur = connection.cursor()
schema = connection.settings_dict.get('NAME')
print('SCHEMA:', schema)

q = "SELECT table_name FROM information_schema.tables WHERE table_schema=%s AND (table_name LIKE %s OR table_name LIKE %s OR table_name LIKE %s)"
cur.execute(q, [schema, '%region%', '%area%', '%branch%'])
tables = [r[0] for r in cur.fetchall()]
print('MATCHING TABLES:', tables)

def conv(v):
    if v is None:
        return None
    if isinstance(v, Decimal):
        return str(v)
    if isinstance(v, (datetime.date, datetime.datetime, datetime.time)):
        return v.isoformat()
    if isinstance(v, bytes):
        try:
            return v.decode('utf-8')
        except Exception:
            return str(v)
    return v

for t in tables:
    cur.execute('SELECT * FROM `%s` LIMIT 100' % t)
    cols = [d[0] for d in cur.description] if cur.description else []
    rows = cur.fetchall()
    print('\n--- %s ---' % t)
    print('COLUMNS:', cols)
    print('ROWS:')
    for row in rows:
        print(json.dumps([conv(x) for x in row], ensure_ascii=False))

print('\nDone')
