import os, django, json, sys

# Ensure project package is on sys.path so Django can import settings
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()
from django.db import connection

cur = connection.cursor()
try:
    cur.execute("DESCRIBE bl_sp3")
    print('SCHEMA:', cur.fetchall())
    cur.execute("SELECT COUNT(*) FROM bl_sp3")
    print('COUNT:', cur.fetchone())
    cur.execute("SELECT contract_number, created_at, created_by FROM bl_sp3 LIMIT 5")
    print('ROWS:', cur.fetchall())
except Exception as e:
    print('ERROR:', str(e))
finally:
    cur.close()
