import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','myproject.settings')
django.setup()
from django.db import connection
cur = connection.cursor()
try:
    cur.execute("SELECT contract_number FROM bl_agreement LIMIT 1")
    r = cur.fetchone()
    if not r:
        cur.execute("SELECT contract_number FROM contract LIMIT 1")
        r = cur.fetchone()
    print(r[0] if r else '')
except Exception as e:
    print('ERR:' + str(e))
