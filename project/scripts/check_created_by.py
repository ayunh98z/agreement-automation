import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','myproject.settings')
import django
django.setup()
from django.db import connection
cursor=connection.cursor()
cursor.execute("SELECT contract_number, created_by, created_at, update_at FROM bl_agreement WHERE contract_number=%s", ['TEST_USERNAMEX'])
print(cursor.fetchone())
