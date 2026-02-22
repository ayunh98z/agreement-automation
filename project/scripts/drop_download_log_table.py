# drop_download_log_table.py
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

import django
from django.db import connection

django.setup()

with connection.cursor() as cursor:
    cursor.execute('DROP TABLE IF EXISTS download_log;')
    print('Dropped table download_log if it existed')
