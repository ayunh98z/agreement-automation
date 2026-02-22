import os
import django
import pymysql
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
# Ensure project root is on sys.path so `import myproject` works when running
# this script directly.
proj_root = os.path.dirname(os.path.dirname(__file__))
if proj_root not in sys.path:
    sys.path.insert(0, proj_root)
django.setup()
from django.conf import settings

cfg = settings.DATABASES['default']
name = cfg.get('NAME')
test_db = f"test_{name}"

host = cfg.get('HOST') or '127.0.0.1'
port = int(cfg.get('PORT') or 3306)
user = cfg.get('USER') or 'root'
password = cfg.get('PASSWORD') or ''

print(f"Connecting to {host}:{port} as {user}, dropping {test_db} if exists...")
conn = pymysql.connect(host=host, user=user, password=password, port=port)
try:
    with conn.cursor() as cur:
        cur.execute(f"DROP DATABASE IF EXISTS `{test_db}`")
        print(f"Dropped {test_db}")
finally:
    conn.close()
