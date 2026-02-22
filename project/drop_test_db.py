import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
try:
    import django
    django.setup()
except Exception as e:
    print('Failed to setup Django:', e)
    sys.exit(1)

from django.conf import settings
import pymysql

db = settings.DATABASES.get('default', {})
name = db.get('NAME')
user = db.get('USER')
password = db.get('PASSWORD')
host = db.get('HOST') or '127.0.0.1'
port = int(db.get('PORT') or 3306)

if not name:
    print('No database name found in settings')
    sys.exit(1)

test_db = f"test_{name}"

try:
    conn = pymysql.connect(host=host, user=user, password=password, port=port)
    with conn.cursor() as cur:
        cur.execute(f"DROP DATABASE IF EXISTS `{test_db}`;")
    conn.commit()
    print(f"Dropped database: {test_db}")
    sys.exit(0)
except Exception as e:
    print('Error dropping test database:', e)
    sys.exit(2)
