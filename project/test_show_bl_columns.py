import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','myproject.settings')
import django
django.setup()
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute('SHOW COLUMNS FROM bl_agreement')
    for row in cursor.fetchall():
        print(row)
