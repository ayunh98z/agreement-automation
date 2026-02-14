import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','myproject.settings')
import django
django.setup()
from django.db import connection
cn = 'TEST-COLL-001'
with connection.cursor() as cursor:
    cursor.execute('SELECT contract_number, collateral_type, created_at FROM bl_agreement WHERE contract_number=%s LIMIT 1', [cn])
    row = cursor.fetchone()
    print(row)
