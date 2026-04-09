import os, sys
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

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s AND (table_name LIKE %s OR table_name LIKE %s)", [schema, '%director%', '%contract%'])
tables = [r[0] for r in cur.fetchall()]
print('MATCHING TABLES:', tables)

for t in ['director','contract','contracts']:
    try:
        cur.execute("SELECT * FROM `%s` LIMIT 10" % t)
        cols = [d[0] for d in cur.description] if cur.description else []
        rows = cur.fetchall()
        print('\n--- %s ---' % t)
        print('COLUMNS:', cols)
        for r in rows:
            print(r)
    except Exception as e:
        print('\nERR', t, str(e))
